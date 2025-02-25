import Container from 'typedi';
import { AppDataSource } from '../data-source';
import hexProgram from './hexProgram';
import { AccountsMustHavePassword } from './data-inconsistency-checks/AccountsMustHavePassword';
import { MoveTimestampsAreOrdered } from './data-inconsistency-checks/MoveTimestampsAreOrdered';
import { DataInconsistenciesCheckerInterface } from './data-inconsistency-checks/DataInconsistenciesCheckerInterface';
import { RatingChangesOnlyWhenApplicable } from './data-inconsistency-checks/RatingChangesOnlyWhenApplicable';
import { TimeoutGamesWithLessThan2MovesMustBeCanceled } from './data-inconsistency-checks/TimeoutGamesWithLessThan2MovesMustBeCanceled';
import { GamesWithAIMustHaveOpponentId } from './data-inconsistency-checks/GamesWithAIMustHaveOpponentId';
import { InconsistentWinnerStateOutcome } from './data-inconsistency-checks/InconsistentWinnerStateOutcome';

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
