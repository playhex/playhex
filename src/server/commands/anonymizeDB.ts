import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { hashPassword } from '../services/security/authentication';
import hexProgram from './hexProgram';
import { orm } from '../data-source';
import { Player } from '../../shared/app/models';

hexProgram
    .command('db-anonymize')
    .description('Anonymize database personal data for development purpose. Must not be run on production for sure.')
    .action(async () => {
        const rl = readline.createInterface({ input: stdin, output: stdout });
        const answer = await rl.question('This will remove data, not to do on real database! Are you sure? Type "yes": ');

        rl.close();

        if ('yes' !== answer) {
            console.log('Nothing has been done (type "yes" if you wanted to).');
            return;
        }

        console.log('Replacing all account passwords to "test"...');
        const em = orm.em.fork();

        await em.createQueryBuilder(Player)
            .update({ password: await hashPassword('test') })
            .where({ password: { $ne: null } })
            .execute()
        ;

        console.log('done');
    })
;
