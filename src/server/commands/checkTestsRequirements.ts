import { AppDataSource, appDataSourceInitialized } from '../data-source.js';
import hexProgram from './hexProgram.js';
import { Player } from '../../shared/app/models/index.js';

hexProgram
    .command('check-tests-requirements')
    .description('Check whether config is ok to run integration tests')
    .action(async () => {
        await appDataSourceInitialized;

        if (process.env.ALLOW_RANKED_BOT_GAMES !== 'true') {
            throw new Error('[FAIL] env var "ALLOW_RANKED_BOT_GAMES" must be true');
        }

        await checkBots();

        console.log('[ OK ] environment should be ok to run integration tests.');
    })
;

const checkBots = async (): Promise<void> => {
    await appDataSourceInitialized;

    const playerRepository = AppDataSource.getRepository(Player);

    const findBot = async (slug: string): Promise<Player | null> => await playerRepository.findOne({
        where: { slug },
        relations: { aiConfig: true },
    });

    const randomInstant = await findBot('test-determinist-instant');
    const randomWait = await findBot('test-determinist-wait');

    if (!randomInstant || !randomWait) {
        throw new Error('[FAIL] test bots missing, run: "pnpm hex create-test-bots"');
    }

    if (randomInstant.aiConfig?.config.wait !== 0) {
        throw new Error('[FAIL] test-determinist-instant ai config changed, be sure that it is: { "wait": 0, "determinist": true }');
    }

    if (randomWait.aiConfig?.config.wait !== 1000) {
        throw new Error('[FAIL] test-determinist-wait ai config changed, be sure that it is: { "wait": 1000, "determinist": true }');
    }
};
