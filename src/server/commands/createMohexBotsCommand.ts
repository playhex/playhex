import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-mohex-bots')
    .description('Create Mohex bots config in database')
    .option('--reuse-player', 'If AI player exists but not AI config, reuse player instance')
    .action(async ({ reusePlayer }) => {
        const configs: { relativeLevel: number, level: string, maxGames: number, description?: string, pseudo?: string, slug?: string, label?: string }[] = [
            { relativeLevel: 2, level: '1', maxGames: 12, slug: 'mohex-1-5' },
            { relativeLevel: 3, level: '2', maxGames: 20 },
            { relativeLevel: 3, level: '3', maxGames: 100 },
            { relativeLevel: 3, level: '4', maxGames: 400 },
            { relativeLevel: 4, level: '5', maxGames: 1000 },
            { relativeLevel: 4, level: '6', maxGames: 2000, description: 'max 2000 sim., ~1s per move' },
            { relativeLevel: 4, level: 'Full', label: 'Mohex', maxGames: 500000, description: 'not limited, ~25s per move', slug: 'mohex', pseudo: 'Mohex' },
        ];

        let index = 0;

        for (const config of configs) {
            const { level, maxGames, description, pseudo, slug, relativeLevel } = config;
            const label = config.label ?? `Mohex ${level}`;

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
                relativeLevel,
            }, reusePlayer);

            if (!created) {
                console.log(`Bot "${label}" already created`);
            }

            ++index;
        }

        console.log('Mohex bots created.');
    })
;
