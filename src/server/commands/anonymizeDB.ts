import { hashPassword } from '../services/security/authentication.js';
import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { mustAnswerYes } from './utils/question.js';

hexProgram
    .command('db-anonymize')
    .description('Anonymize database personal data for development purpose. Must not be run on production for sure.')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        await mustAnswerYes('This will remove data, not to do on real database!');

        console.log('Replacing all account passwords to "test"...');
        await AppDataSource.query(
            'update player set password = ? where password is not null',
            [await hashPassword('test')],
        );

        console.log('Remove all push notifications');
        await AppDataSource.query(
            'truncate player_push_subscription',
        );

        console.log('done');
    })
;
