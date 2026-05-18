import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-davies-bots')
    .description('Create Davies bots config in database')
    .option('--reuse-player', 'If AI player exists but not AI config, reuse player instance')
    .action(async ({ reusePlayer }) => {
        const createDaviesLevel = async (relativeLevel: number, level: number, description?: string): Promise<void> => {
            await createAiConfigIfNotExists({
                engine: 'davies',
                config: { level },
                boardsizeMin: 11,
                boardsizeMax: 11,
                isRemote: false,
                requireMorePower: false,
                label: `Davies ${level}`,
                pseudo: `Davies ${level}`,
                slug: `davies-${level}`,
                order: level + 9,
                description,
                relativeLevel,
            }, reusePlayer);
        };

        await createDaviesLevel(1, 1, 'for beginners');
        await createDaviesLevel(1, 4);
        await createDaviesLevel(2, 7);
        await createDaviesLevel(2, 10);

        console.log('Davies bots created.');
    })
;
