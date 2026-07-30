import { AppDataSource } from '../data-source.js';
import { compareAllPositions, positionDiffDistance } from '../../shared/canonical-position/index.js';
import hexProgram from './hexProgram.js';

type GameRow = {
    publicId: string;
    moves: string;
};

const gameUrlPrefix = (process.env.BASE_URL ?? 'http://localhost:3000') + '/games/';

hexProgram
    .command('find-similar-games')
    .description('Find the games most similar to a given game, among all other games in database')
    .requiredOption('--game <publicId>', 'Public id (uuid) of the reference game')
    .option('--top <number>', 'Number of similar games to return', '5')
    .action(async ({ game: gamePublicId, top }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const topCount = parseInt(top, 10);

        const referenceRows: GameRow[] = await AppDataSource.query(
            'select publicId, boardsize, moves from hosted_game where publicId = ?',
            [gamePublicId],
        );

        if (referenceRows.length === 0) {
            throw new Error(`No game found with publicId "${gamePublicId}"`);
        }

        const [{ moves: referenceMoves, boardsize }] = referenceRows as unknown as { moves: string; boardsize: number }[];

        // A candidate can only match if it is the same board size,
        // and we only select the columns actually needed for the comparison
        // (not the whole row, nor any relation), to keep this cheap on a large games table.
        const candidates: GameRow[] = await AppDataSource.query(
            'select publicId, moves from hosted_game where boardsize = ? and publicId != ? and moves != \'\'',
            [boardsize, gamePublicId],
        );

        console.log(`Reference game: ${referenceMoves.split(' ').length} moves, ${gameUrlPrefix}${gamePublicId}`);
        console.log(`Comparing reference game against ${candidates.length} candidate games of boardsize ${boardsize}...`);

        const topMatches: { publicId: string; distance: number; movesCount: number }[] = [];

        for (const candidate of candidates) {
            const distance = positionDiffDistance(
                compareAllPositions(referenceMoves, candidate.moves, boardsize),
            );

            if (topMatches.length < topCount || distance < topMatches[topMatches.length - 1].distance) {
                topMatches.push({ publicId: candidate.publicId, distance, movesCount: candidate.moves.split(' ').length });
                topMatches.sort((a, b) => a.distance - b.distance);

                if (topMatches.length > topCount) {
                    topMatches.length = topCount;
                }
            }
        }

        console.log(`Top ${topMatches.length} most similar games to "${gamePublicId}":`);

        topMatches.forEach((match, i) => {
            console.log(`${i + 1}. ${match.publicId} (distance: ${match.distance}, moves: ${match.movesCount}) ${gameUrlPrefix}${match.publicId}`);
        });
    })
;
