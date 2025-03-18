import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-mohex-bots')
    .description('Create Mohex bots config in database')
    .action(async () => {
        let created: boolean;

        const configs = [
            { level: 1, maxGames: 8 },
            { level: 2, maxGames: 20 },
            { level: 3, maxGames: 100 },
            { level: 4, maxGames: 400 },
            { level: 5, maxGames: 1000 },
        ];

        configs.forEach(async ({ level, maxGames }) => {
            const label = `Level ${level}`;
            console.log(`Creating bot "${label}"...`);

            created = await createAiConfigIfNotExists({
                config: { maxGames },
                engine: 'mohex',
                label,
                description: `max ${maxGames} simulations`,
                order: 20 + level - 1,
                boardsizeMax: 13,
                isRemote: true,
                requireMorePower: maxGames > 20,
                pseudo: `Mohex ${level}`,
                slug: `mohex-${level}`,
            });

            if (!created) {
                console.log(`Bot "${label}" already created`);
            }
        });

        console.log(`Creating bot "Mohex"...`);

        created = await createAiConfigIfNotExists({
            config: { maxGames: 500000 },
            engine: 'mohex',
            label: 'Full',
            description: 'not limited',
            order: 25,
            boardsizeMax: 13,
            isRemote: true,
            requireMorePower: true,
            pseudo: 'Mohex',
            slug: 'mohex',
        });

        if (!created) {
            console.log('Bot "Mohex" already created');
        }

        console.log('Mohex bots created.');
    })
;
