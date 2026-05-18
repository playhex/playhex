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
            config: { treeSearch: false },
            engine: 'katahex',
            label: 'Katahex Intuition',
            description: 'model only',
            order: 30,
            boardsizeMin: 2,
            boardsizeMax: 32,
            isRemote: true,
            requireMorePower: false,
            pseudo: 'Katahex intuition',
            slug: 'katahex-intuition',
            relativeLevel: 5,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Katahex intuition" already created');
        }

        console.log('Creating bot "Katahex"...');

        created = await createAiConfigIfNotExists({
            config: { treeSearch: true },
            engine: 'katahex',
            label: 'Katahex Full',
            description: 'model + simulations',
            order: 31,
            boardsizeMin: 2,
            boardsizeMax: 32,
            isRemote: true,
            requireMorePower: true,
            pseudo: 'Katahex',
            slug: 'katahex',
            relativeLevel: 6,
        }, reusePlayer);

        if (!created) {
            console.log('Bot "Katahex" already created');
        }

        console.log('Katahex bots created.');
    })
;
