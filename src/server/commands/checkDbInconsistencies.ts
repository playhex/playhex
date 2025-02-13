import { Player } from '../../shared/app/models';
import { AppDataSource } from '../data-source';
import hexProgram from './hexProgram';
import { IsNull, Like, Not } from 'typeorm';

hexProgram
    .command('check-inconsistencies')
    .description('Check inconsistencies in database')
    .action(async () => {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        const playerRepository = AppDataSource.getRepository(Player);

        /*
         * No accounts without password
         */
        const accountsWithoutPassword = await playerRepository.findBy({
            isGuest: false,
            isBot: false,
            password: IsNull(),
            slug: Not(Like('anonymous%')),
        });

        console.log(0 === accountsWithoutPassword.length ? ' OK ' : 'FAIL', 'No accounts without password');

        for (const player of accountsWithoutPassword) {
            console.log('   -> ', player.pseudo);
        }

        /*
         * No rating change if game is unranked or canceled
         */

        /*
         * resigned games have 2 moves or more
         */
        /*
            select hg.id, g.endedAt, json_length(g.movesHistory) as moves, concat('http://localhost:3000/games/', hg.publicId)
            from game g
            inner join hosted_game hg on hg.id = g.hostedGameId
            where g.outcome = 'resign'
            and json_length(g.movesHistory) < 2
         */
    })
;
