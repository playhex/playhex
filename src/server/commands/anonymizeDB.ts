import { hashPassword } from '../services/security/authentication.js';
import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { mustAnswerYes } from './utils/question.js';

hexProgram
    .command('db-anonymize')
    .description('Anonymize database personal data for development purpose. Must not be run on production for sure.')
    .action(async () => {
        await appDataSourceInitialized;

        await mustAnswerYes('This will remove data, not to do on real database!');

        console.log('Replacing all account passwords to "test"...');
        await AppDataSource.query(
            'update player_account_password set password = ? where password is not null',
            [await hashPassword('test')],
        );

        console.log('Remove account private data');
        await AppDataSource.query('truncate player_account_discord');
        await AppDataSource.query('truncate player_account_email');
        await AppDataSource.query('truncate player_ai_worker_key');
        await AppDataSource.query('truncate player_cheat');
        await AppDataSource.query('truncate player_push_subscription');
        await AppDataSource.query('truncate player_ip');

        console.log('Remove conditional moves of still playing games');
        await AppDataSource.query(
            'delete cm from conditional_moves cm join game g on cm.gameId = g.id where g.state != "ended"',
        );

        console.log('Remove survey answers');
        await AppDataSource.query('truncate survey_answer');

        console.log('done');
    })
;
