import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-random-bots')
    .description('Create random bots config in database')
    .option('--reuse-player', 'If AI player exists but not AI config, reuse player instance')
    .action(async ({ reusePlayer }) => {
        let created: boolean;

        console.log('Creating bot "Random"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: false },
            engine: 'random',
            label: 'Random',
            description: 'plays randomly',
            order: 40,
            pseudo: 'Random bot',
            slug: 'random-bot',
            relativeLevel: 0,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Random" already created');
        }

        console.log('Creating bot "Determinist"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: true },
            engine: 'random',
            label: 'Determinist',
            description: 'plays same responses',
            order: 41,
            pseudo: 'Determinist random bot',
            slug: 'determinist-random-bot',
            relativeLevel: 0,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Determinist" already created');
        }

        console.log('Random bots created.');
    })
;
