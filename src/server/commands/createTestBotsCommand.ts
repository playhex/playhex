import hexProgram from './hexProgram.js';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists.js';

hexProgram
    .command('create-test-bots')
    .description('Create test bots config in database, used for integration tests')
    .action(async () => {
        let created: boolean;

        console.log('Creating bot "TestBot Determinist instant"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: true, wait: 0 },
            engine: 'random',
            label: 'TestBot Determinist instant',
            description: 'plays randomly, instantly',
            order: 40,
            pseudo: 'TestBot Determinist instant',
            slug: 'test-determinist-instant',
        });

        if (!created) {
            console.log('Bot "TestBot Determinist instant" already created');
        }

        console.log('Creating bot "TestBot Determinist wait"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: true, wait: 1000 },
            engine: 'random',
            label: 'TestBot Determinist wait',
            description: 'plays randomly, wait 1s before play',
            order: 41,
            pseudo: 'TestBot Determinist wait',
            slug: 'test-determinist-wait',
        });

        if (!created) {
            console.log('Bot "TestBot Determinist wait" already created');
        }

        console.log('Random bots created.');
    })
;
