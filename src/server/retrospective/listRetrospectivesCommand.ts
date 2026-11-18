import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import hexProgram from '../commands/hexProgram.js';
import { PlayerRetrospective } from '../../shared/app/models/index.js';

/**
 * Lists links to published retrospectives of all players, with their share codes.
 * Urls based on BASE_URL of .env, or relative urls.
 */
hexProgram
    .command('list-retrospectives')
    .description('List links to published retrospectives of all players, most recent year first')
    .option('--year <year>', 'Only retrospectives of this year, e.g 2026')
    .option('--player <slug>', 'Only retrospectives of this player')
    .option('--limit <limit>', 'Max number of retrospectives to list', '20')
    .action(async options => {
        await appDataSourceInitialized;

        const limit = parseInt(options.limit, 10);

        if (!Number.isInteger(limit) || limit < 1) {
            throw new Error(`Invalid limit "${options.limit}"`);
        }

        const queryBuilder = AppDataSource.getRepository(PlayerRetrospective)
            .createQueryBuilder('retrospective')
            .innerJoinAndSelect('retrospective.player', 'player')
            .where('retrospective.hidden = false')
            .andWhere('retrospective.publishedAt is not null')
            .orderBy('retrospective.year', 'DESC')
            .addOrderBy('retrospective.games1v1', 'DESC')
            .take(limit)
        ;

        if (options.year !== undefined) {
            const year = parseInt(options.year, 10);

            if (!Number.isInteger(year)) {
                throw new Error(`Invalid year "${options.year}"`);
            }

            queryBuilder.andWhere('retrospective.year = :year', { year });
        }

        if (options.player !== undefined) {
            queryBuilder.andWhere('player.slug = :slug', { slug: options.player });
        }

        const retrospectives = await queryBuilder.getMany();
        const baseUrl = process.env.BASE_URL ?? '';

        for (const { year, shareCode, player } of retrospectives) {
            console.log(`${year}\t${player!.pseudo}\t${baseUrl}/@${player!.slug}/retro/${year}/${shareCode}`);
        }

        if (retrospectives.length === 0) {
            console.log('No retrospectives found.');
        }
    })
;
