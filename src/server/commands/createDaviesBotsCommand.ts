import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-davies-bots')
    .description('Create Davies bots config in database')
    .action(async () => {
        const createDaviesLevel = async (level: number): Promise<void> => {
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
                order: level,
            });
        };

        await createDaviesLevel(1);
        await createDaviesLevel(4);
        await createDaviesLevel(7);
        await createDaviesLevel(10);

        console.log('Davies bots created.');
    })
;
