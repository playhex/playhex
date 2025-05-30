import { Container } from 'typedi';
import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { AccountsMustHavePassword } from './data-inconsistency-checks/AccountsMustHavePassword.js';
import { MoveTimestampsAreOrdered } from './data-inconsistency-checks/MoveTimestampsAreOrdered.js';
import { DataInconsistenciesCheckerInterface } from './data-inconsistency-checks/DataInconsistenciesCheckerInterface.js';
import { RatingChangesOnlyWhenApplicable } from './data-inconsistency-checks/RatingChangesOnlyWhenApplicable.js';
import { TimeoutGamesWithLessThan2MovesMustBeCanceled } from './data-inconsistency-checks/TimeoutGamesWithLessThan2MovesMustBeCanceled.js';
import { GamesWithAIMustHaveOpponentId } from './data-inconsistency-checks/GamesWithAIMustHaveOpponentId.js';
import { InconsistentWinnerStateOutcome } from './data-inconsistency-checks/InconsistentWinnerStateOutcome.js';

hexProgram
    .command('check-inconsistencies')
    .description('Check inconsistencies in database')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const checkers: DataInconsistenciesCheckerInterface[] = [
            Container.get(AccountsMustHavePassword),
            Container.get(RatingChangesOnlyWhenApplicable),
            Container.get(TimeoutGamesWithLessThan2MovesMustBeCanceled),
            Container.get(GamesWithAIMustHaveOpponentId),
            Container.get(InconsistentWinnerStateOutcome),
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
    })
;
