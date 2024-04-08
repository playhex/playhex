import hexProgram from './hexProgram';
import createAiConfigIfNotExists from './utils/createAiConfigIfNotExists';

hexProgram
    .command('create-random-bots')
    .description('Create random bots config in database')
    .action(async () => {
        let created: boolean;

        console.log('Creating bot "Random"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: false },
            engine: 'random',
            label: 'Random',
            description: 'plays randomly',
            order: 30,
            pseudo: 'Random bot',
            slug: 'random-bot',
        });

        if (!created) {
            console.log('Bot "Random" already created');
        }

        console.log('Creating bot "Determinist"...');

        created = await createAiConfigIfNotExists({
            config: { determinist: true },
            engine: 'random',
            label: 'Determinist',
            description: 'plays same responses',
            order: 31,
            pseudo: 'Determinist random bot',
            slug: 'determinist-random-bot',
        });

        if (!created) {
            console.log('Bot "Determinist" already created');
        }

        console.log('Random bots created.');
    })
;
