import Container from 'typedi';
import { AppDataSource } from '../data-source';
import hexProgram from './hexProgram';
import { AccountsMustHavePassword } from './data-inconsistency-checks/AccountsMustHavePassword';
import { MoveTimestampsAreOrdered } from './data-inconsistency-checks/MoveTimestampsAreOrdered';
import { DataInconsistenciesCheckerInterface } from './data-inconsistency-checks/DataInconsistenciesCheckerInterface';

hexProgram
    .command('check-inconsistencies')
    .description('Check inconsistencies in database')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const checkers: DataInconsistenciesCheckerInterface[] = [
            Container.get(AccountsMustHavePassword),
            Container.get(MoveTimestampsAreOrdered),
        ];

        for (const checker of checkers) {
            const inconsistencies = await checker.run();

            console.log(
                0 === inconsistencies.length ? ' OK ' : `FAIL (${inconsistencies.length})`,
                checker.getDescription(),
            );

            for (const inconsistency of inconsistencies) {
                console.log('      -> ', inconsistency);
            }
        }

        console.log('DONE');

        /*
         * No rating change if game is unranked or canceled
         */

        /*
         * No ai game without opponentPublicId
         * SELECT * FROM `hosted_game_options` WHERE `opponentType` = 'ai' AND `opponentPublicId` IS NULL LIMIT 50
         */

        /*
         * resigned games should have 2 moves or more
         */
        /*
            select hg.id, g.endedAt, json_length(g.movesHistory) as moves, concat('http://localhost:3000/games/', hg.publicId)
            from game g
            inner join hosted_game hg on hg.id = g.hostedGameId
            where g.outcome = 'resign'
            and json_length(g.movesHistory) < 2
         */


        // games lost on time with < 2 moves must be canceled
    })
;
