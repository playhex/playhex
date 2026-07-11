import { AppDataSource } from '../data-source.js';
import { allMirrorsBandHashes } from '../../shared/canonical-position/minhash.js';
import hexProgram from './hexProgram.js';

type GameRow = {
    id: number;
    boardsize: number;
    moves: string;
};

const batchSize = 2000;

hexProgram
    .command('index-game-positions')
    .description('Compute and store position band hashes of ended games not yet indexed, used by find-similar-games. Can be re-run to index new games.')
    .option('--rebuild', 'Drop and recreate the game_position_band table, and reindex all games from scratch. Foreign key is added only after the backfill, making inserts faster.')
    .action(async ({ rebuild }) => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        if (rebuild) {
            console.log('Recreating game_position_band table, with primary key only...');

            await AppDataSource.query('drop table if exists game_position_band');
            await AppDataSource.query(
                `create table game_position_band (
                    bandNo tinyint not null,
                    bandHash int unsigned not null,
                    hostedGameId int not null,
                    primary key (bandNo, bandHash, hostedGameId)
                ) engine=InnoDB`,
            );
        }

        let indexedTotal = 0;
        let lastId = 0;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Only games not yet indexed: every indexed game has a bandNo = 0 row.
            // "hg.id > lastId" cursor guarantees progress even on games that cannot be indexed
            // (e.g only pass moves), which would else be returned again forever.
            // On rebuild, the table is empty and has no index yet: skip the "not yet indexed" join.
            const games: GameRow[] = await AppDataSource.query(
                rebuild
                    ? `select hg.id, hg.boardsize, hg.moves
                        from hosted_game hg
                        where hg.id > ?
                        and hg.state = 'ended'
                        and hg.moves != ''
                        order by hg.id
                        limit ?`
                    : `select hg.id, hg.boardsize, hg.moves
                        from hosted_game hg
                        left join game_position_band gpb on gpb.hostedGameId = hg.id and gpb.bandNo = 0
                        where gpb.hostedGameId is null
                        and hg.id > ?
                        and hg.state = 'ended'
                        and hg.moves != ''
                        order by hg.id
                        limit ?`,
                [lastId, batchSize],
            );

            if (games.length === 0) {
                break;
            }

            lastId = games[games.length - 1].id;

            const values: number[] = [];
            let skipped = 0;

            for (const game of games) {
                if (game.moves.split(' ').length < 4) {
                    // Too short games are not worth indexing
                    ++skipped;
                    continue;
                }

                const positionBandHashes = allMirrorsBandHashes(game.moves, game.boardsize);

                if (positionBandHashes === null) {
                    // Position has no stone (e.g. only pass moves), nothing to index
                    ++skipped;
                    continue;
                }

                // Index the position and its 3 mirrors,
                // so mirrored games are found without mirroring the searched position at query time
                for (const bandHashes of [positionBandHashes.bandHashes, ...positionBandHashes.mirrorsBandHashes]) {
                    bandHashes.forEach((bandHash, bandNo) => {
                        values.push(bandNo, bandHash, game.id);
                    });
                }
            }

            if (values.length > 0) {
                await AppDataSource.query(
                    'insert ignore into game_position_band (bandNo, bandHash, hostedGameId) values '
                        + Array(values.length / 3).fill('(?, ?, ?)').join(', '),
                    values,
                );
            }

            indexedTotal += games.length - skipped;
            console.log(`${indexedTotal} games indexed...`);

            if (games.length < batchSize) {
                break;
            }
        }

        console.log(`Done, ${indexedTotal} games indexed.`);

        if (rebuild) {
            console.log('Adding foreign key...');

            await AppDataSource.query(
                `alter table game_position_band
                    add constraint FK_game_position_band_hostedGameId foreign key (hostedGameId) references hosted_game (id)`,
            );

            console.log('Foreign key added.');
        }
    })
;
