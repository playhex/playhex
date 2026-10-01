import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-katahex-bots')
    .description('Create Katahex bots config in database')
    .option('--reuse-player', 'If AI player exists but not AI config, reuse player instance')
    .action(async ({ reusePlayer }) => {
        let created: boolean;

        console.log('Creating bot "Katahex intuition"...');

        created = await createAiConfigIfNotExists({
            config: { maxPlayouts: 0 },
            engine: 'katahex',
            label: 'Katahex Intuition',
            description: 'model only (no simulations)',
            order: 30,
            boardsizeMin: 2,
            boardsizeMax: 32,
            pseudo: 'Katahex intuition',
            slug: 'katahex-intuition',
            relativeLevel: 5,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Katahex intuition" already created');
        }

        console.log('Creating bot "Katahex"...');

        created = await createAiConfigIfNotExists({
            config: { maxPlayouts: 400 },
            engine: 'katahex',
            label: 'Katahex 400',
            description: 'max 400 simulations',
            order: 31,
            boardsizeMin: 2,
            boardsizeMax: 32,
            pseudo: 'Katahex 400',
            slug: 'katahex-400',
            relativeLevel: 6,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Katahex" already created');
        }

        console.log('Katahex bots created.');
    })
;
