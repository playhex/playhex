import { AppDataSource } from '../data-source.js';
import { compareAllPositions, positionDiffDistance } from '../../shared/canonical-position/index.js';
import { positionBandHashes } from '../../shared/canonical-position/minhash.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import hexProgram from './hexProgram.js';

type GameRow = {
    publicId: string;
    moves: string;
};

type Match = {
    publicId: string;
    similarTo: string;
    distance: number;
    movesCount: number;
};

const gameUrlPrefix = (process.env.BASE_URL ?? 'http://localhost:3000') + '/games/';

hexProgram
    .command('find-similar-games')
    .description('Find the games most similar to given games, among all other games in database')
    .requiredOption('--game <publicIds...>', 'Public id (uuid) of the reference game. Accepts many ids: all similarities are then checked, and only best matches of all are returned.')
    .option('--top <number>', 'Number of similar games to return', '5')
    .option('--full-scan', 'Compare to every game in database instead of using the band hashes index. Slower, but finds games even when index is not up to date, and has no similarity threshold.')
    .action(async ({ game: gamePublicIds, top, fullScan }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const topCount = parseInt(top, 10);
        let allMatches: Match[] = [];

        for (const gamePublicId of gamePublicIds) {
            // no spread in push(): with --full-scan, matches can be hundreds of thousands,
            // and each spread element becomes a function argument, exceeding the call stack
            allMatches = allMatches.concat(await findSimilarGames(gamePublicId, gamePublicIds, fullScan ?? false));
        }

        allMatches.sort((a, b) => a.distance - b.distance || b.movesCount - a.movesCount);

        const topMatches = allMatches.slice(0, topCount);

        const playersByGame = await fetchGamePlayers([
            ...topMatches.map(match => match.publicId),
            ...topMatches.map(match => match.similarTo),
        ]);

        console.log('');
        console.log(`Top ${topMatches.length} most similar games:`);

        topMatches.forEach((match, i) => {
            console.log(`${i + 1}. distance: ${match.distance}, moves: ${match.movesCount} ${gameUrlPrefix}${match.publicId} (${playersByGame[match.publicId] ?? '?'}) similar to ${gameUrlPrefix}${match.similarTo} (${playersByGame[match.similarTo] ?? '?'})`);
        });
    })
;

/**
 * Compare a reference game to its candidates,
 * returns all comparisons made, unsorted.
 * Other provided reference games are excluded from matches.
 */
const findSimilarGames = async (gamePublicId: string, allReferencePublicIds: string[], fullScan: boolean): Promise<Match[]> => {
    const referenceRows: { moves: string; boardsize: number }[] = await AppDataSource.query(
        'select boardsize, moves from hosted_game where publicId = ?',
        [gamePublicId],
    );

    if (referenceRows.length === 0) {
        console.error(`No game found with publicId "${gamePublicId}", skipping.`);
        return [];
    }

    const [{ moves: referenceMoves, boardsize }] = referenceRows;

    console.log(`Reference game: ${referenceMoves.split(' ').length} moves, ${gameUrlPrefix}${gamePublicId}`);

    const candidates: GameRow[] = fullScan
        ? await fetchAllGames(gamePublicId, boardsize)
        : await fetchCandidatesFromBandIndex(gamePublicId, referenceMoves, boardsize)
    ;

    console.log(`Comparing reference game against ${candidates.length} candidate games...`);

    if (!fullScan && candidates.length === 0) {
        console.log('No candidate found in band hashes index: index may not be up to date, run "yarn hex index-game-positions". Or no similar enough game exists, use --full-scan to compare to every game.');
    }

    const matches: Match[] = [];

    for (const candidate of candidates) {
        if (allReferencePublicIds.includes(candidate.publicId)) {
            continue;
        }

        matches.push({
            publicId: candidate.publicId,
            similarTo: gamePublicId,
            distance: positionDiffDistance(
                compareAllPositions(referenceMoves, candidate.moves, boardsize),
            ),
            movesCount: candidate.moves.split(' ').length,
        });
    }

    return matches;
};

/**
 * Fetch players names of given games,
 * returns i.e { 'uuid...': 'Katahex vs Guest 1234', ... }
 */
const fetchGamePlayers = async (gamePublicIds: string[]): Promise<{ [publicId: string]: string }> => {
    if (gamePublicIds.length === 0) {
        return {};
    }

    const rows: { publicId: string; pseudo: string; isGuest: number }[] = await AppDataSource.query(
        `select hg.publicId, p.pseudo, p.isGuest
        from hosted_game hg
        inner join hosted_game_to_player hgp on hgp.hostedGameId = hg.id
        inner join player p on p.id = hgp.playerId
        where hg.publicId in (${gamePublicIds.map(() => '?').join(', ')})
        order by hg.publicId, hgp.\`order\``,
        gamePublicIds,
    );

    const playersByGame: { [publicId: string]: string } = {};

    for (const { publicId, pseudo, isGuest } of rows) {
        const name = pseudoString({ pseudo, isGuest: isGuest === 1 } as Parameters<typeof pseudoString>[0]);

        playersByGame[publicId] = publicId in playersByGame
            ? `${playersByGame[publicId]} vs ${name}`
            : name
        ;
    }

    return playersByGame;
};

/**
 * How many best candidates from the band hashes index
 * are kept for exact comparison.
 */
const maxCandidates = 5000;

/**
 * Fetch only games that collide with the reference position
 * (or one of its mirrors) on at least one band hash,
 * i.e games with a high probability of being similar.
 * Few index lookups, no matter how many games in database.
 *
 * Games colliding on many bands are far more likely to be similar
 * than games colliding on a single band by luck,
 * so candidates are ranked by number of colliding bands
 * and only the best maxCandidates are kept for exact comparison.
 */
const fetchCandidatesFromBandIndex = async (gamePublicId: string, referenceMoves: string, boardsize: number): Promise<GameRow[]> => {
    const bandHashes = positionBandHashes(referenceMoves, boardsize);

    if (bandHashes === null) {
        throw new Error('Reference game position has no stone, cannot search similar games');
    }

    // Only the reference position band hashes are needed:
    // games that are mirrors of the reference are found
    // because all mirror variants of every game are indexed.
    const pairs: [number, number][] = bandHashes.map((bandHash, bandNo) => [bandNo, bandHash]);

    return await AppDataSource.query(
        `select hg.publicId, hg.moves
        from (
            select gpb.hostedGameId, count(*) as collidingBands
            from game_position_band gpb
            where ${pairs.map(() => '(gpb.bandNo = ? and gpb.bandHash = ?)').join(' or ')}
            group by gpb.hostedGameId
            order by collidingBands desc
            limit ?
        ) candidates
        inner join hosted_game hg on hg.id = candidates.hostedGameId
        where hg.publicId != ?`,
        [...pairs.flat(), maxCandidates, gamePublicId],
    );
};

/**
 * Fetch every game of same board size, to compare reference game to all of them.
 * Only select columns needed for the comparison to keep this cheap on a large games table.
 */
const fetchAllGames = async (gamePublicId: string, boardsize: number): Promise<GameRow[]> => {
    return await AppDataSource.query(
        'select publicId, moves from hosted_game where boardsize = ? and publicId != ? and moves != \'\'',
        [boardsize, gamePublicId],
    );
};
