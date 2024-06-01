import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../services/security/authentication';
import { AppDataSource } from '../data-source';
import hexProgram from './hexProgram';

hexProgram
    .command('db-anonymize')
    .description('Anonymize database personal data for development purpose. Must not be run on production for sure.')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const rl = readline.createInterface({ input: stdin, output: stdout });
        const answer = await rl.question('This will remove data, not to do on real database! Are you sure? Type "yes": ');

        rl.close();

        if ('yes' !== answer) {
            console.log('Nothing has been done (type "yes" if you wanted to).');
            return;
        }

        console.log('Replacing all account passwords to "test"...');
        AppDataSource.query(
            'update player set password = ? where password is not null',
            [await hashPassword('test')],
        );

        console.log('done');
    })
;
