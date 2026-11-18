import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import hexProgram from '../commands/hexProgram.js';
import { Player, PlayerRetrospective } from '../../shared/app/models/index.js';
import RetrospectiveGenerator from './RetrospectiveGenerator.js';

/**
 * Computes players yearly retrospectives.
 * Retrospectives are only displayed once generated (and year is over),
 * there is no on the fly generation.
 *
 * Run years in order (e.g 2025 then 2026), so that progress compares to a complete previous year.
 *
 * Run "analyze-games" before: accuracy and blunder are computed only on analyzed games,
 * so more analyzed games give more choice.
 */
hexProgram
    .command('generate-retrospectives')
    .description('Compute players yearly retrospectives, and publish them')
    .argument('<year>', 'Year of the retrospectives, e.g 2026')
    .option('--force', 'Recompute already generated retrospectives')
    .option('--player <slug>', 'Only (re)compute retrospective of this player. Top percents are still computed against all players of the year')
    .action(async (yearArg, options) => {
        await appDataSourceInitialized;

        const year = parseInt(yearArg, 10);

        if (!Number.isInteger(year) || year < 2023 || year > new Date().getUTCFullYear()) {
            throw new Error(`Invalid year "${yearArg}"`);
        }

        if (year === new Date().getUTCFullYear()) {
            console.warn(`Warning: year ${year} is not over, retrospectives will be incomplete. They are not displayed until next year.`);
        }

        console.log('Tip: run "pnpm hex analyze-games" before, accuracy and blunder are computed only on analyzed games: more analyzed games give more choice.');

        const generator = new RetrospectiveGenerator(AppDataSource);
        const repository = AppDataSource.getRepository(PlayerRetrospective);

        let playerIds: number[];

        if (options.player) {
            const player = await AppDataSource.getRepository(Player).findOneBy({ slug: options.player });

            if (player === null || !player.id) {
                throw new Error(`Player "${options.player}" not found`);
            }

            playerIds = [player.id];
        } else {
            playerIds = await generator.loader.findEligiblePlayerIds(year);

            // Also recompute already generated ones no longer eligible, so they get hidden
            if (options.force) {
                const existingRows = await repository.find({ select: { playerId: true }, where: { year } });

                playerIds = [...new Set([...playerIds, ...existingRows.map(row => row.playerId)])];
            }
        }

        const force = options.force || !!options.player;

        console.log(`${playerIds.length} players to process for ${year}...`);

        /*
         * 1st pass: compute stats of each player
         */
        const computedPreviousYear = new Set<number>();
        let computed = 0;
        let i = 0;

        for (const playerId of playerIds) {
            ++i;

            if (i % 100 === 0) {
                console.log(`${i}/${playerIds.length}`);
            }

            const existing = await repository.findOneBy({ playerId, year });

            if (existing === null || force) {
                const retrospective = await generator.compute(playerId, year);

                // Keep existing publication, and previous values until 2nd pass
                if (existing !== null) {
                    retrospective.publishedAt = existing.publishedAt;
                    retrospective.shareCode = existing.shareCode;
                    retrospective.data.topPercents = existing.data.topPercents;
                    retrospective.data.progress = existing.data.progress;
                    retrospective.data.challenges = existing.data.challenges;
                }

                if (options.player && retrospective.hidden) {
                    console.warn(`Player "${options.player}" is not eligible for ${year}, retrospective computed as hidden.`);
                }

                await repository.save(retrospective);
                ++computed;
            }

            // Previous year snapshot, to show progress
            const previousExists = await repository.existsBy({ playerId, year: year - 1 });

            if (!previousExists && await generator.loader.hasPlayed(playerId, year - 1)) {
                await repository.save(await generator.compute(playerId, year - 1));
                computedPreviousYear.add(playerId);
            }
        }

        console.log(`${computed} retrospectives computed for ${year}, ${computedPreviousYear.size} snapshots computed for ${year - 1}.`);

        /*
         * 2nd pass: top percents, progress, challenges, then publish
         */
        if (computedPreviousYear.size > 0) {
            console.log(`Computing top percents of ${year - 1} snapshots...`);
            await generator.finalizeYear(year - 1, false, computedPreviousYear);
        }

        console.log(`Computing top percents, progress and challenges for ${year}...`);

        const published = await generator.finalizeYear(year, true, options.player ? new Set(playerIds) : undefined);

        console.log(`done, ${published} retrospectives finalized and published for ${year}.`);
    })
;
