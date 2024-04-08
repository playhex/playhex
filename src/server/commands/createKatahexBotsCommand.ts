import hexProgram from './hexProgram';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists';

hexProgram
    .command('create-katahex-bots')
    .description('Create Katahex bots config in database')
    .action(async () => {
        let created: boolean;

        console.log('Creating bot "Katahex intuition"...');

        created = await createAiConfigIfNotExists({
            config: { treeSearch: false },
            engine: 'katahex',
            label: 'Intuition',
            description: 'model only',
            order: 10,
            boardsizeMax: 32,
            isRemote: true,
            requireMorePower: false,
            pseudo: 'Katahex intuition',
            slug: 'katahex-intuition',
        });

        if (!created) {
            console.log('Bot "Katahex intuition" already created');
        }

        console.log('Creating bot "Katahex"...');

        created = await createAiConfigIfNotExists({
            config: { treeSearch: true },
            engine: 'katahex',
            label: 'Full',
            description: 'model + simulations',
            order: 11,
            boardsizeMax: 32,
            isRemote: true,
            requireMorePower: true,
            pseudo: 'Katahex',
            slug: 'katahex',
        });

        if (!created) {
            console.log('Bot "Katahex" already created');
        }

        console.log('Katahex bots created.');
    })
;
