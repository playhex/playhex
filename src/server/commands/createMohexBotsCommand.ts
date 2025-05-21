import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-mohex-bots')
    .description('Create Mohex bots config in database')
    .action(async () => {
        const configs: { level: string, maxGames: number, description?: string, pseudo?: string, slug?: string, label?: string }[] = [
            { level: '1', maxGames: 8 },
            { level: '1.5', maxGames: 12, slug: 'mohex-1-5' },
            { level: '2', maxGames: 20 },
            { level: '3', maxGames: 100 },
            { level: '4', maxGames: 400 },
            { level: '5', maxGames: 1000 },
            { level: '6', maxGames: 2000, description: 'max 2000 sim., ~1s per move' },
            { level: 'Full', label: 'Full', maxGames: 500000, description: 'not limited, ~25s per move', slug: 'mohex', pseudo: 'Mohex' },
        ];

        let index = 0;

        for (const config of configs) {
            const { level, maxGames, description, pseudo, slug } = config;
            let { label } = config;

            label ??= `Level ${level}`;
            console.log(`Creating bot "${label}"...`);

            const created = await createAiConfigIfNotExists({
                config: { maxGames },
                engine: 'mohex',
                label,
                description: description ?? `max ${maxGames} simulations`,
                order: 20 + index,
                boardsizeMax: 13,
                isRemote: true,
                requireMorePower: maxGames > 20,
                pseudo: pseudo ?? `Mohex ${level}`,
                slug: slug ?? `mohex-${level}`,
            });

            if (!created) {
                console.log(`Bot "${label}" already created`);
            }

            ++index;
        }

        console.log('Mohex bots created.');
    })
;
