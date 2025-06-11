import { AppDataSource } from '../data-source.js';
import hexProgram from './hexProgram.js';
import Player from '../../shared/app/models/Player.js';

hexProgram
    .command('check-tests-requirements')
    .description('Check whether config is ok to run integration tests')
    .action(async () => {
        let ok = true;

        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
        }

        // ALLOW_RANKED_BOT_GAMES must be true
        const { ALLOW_RANKED_BOT_GAMES } = process.env;

        if ('true' !== ALLOW_RANKED_BOT_GAMES) {
            ok = false;
            console.log('[FAIL] env var "ALLOW_RANKED_BOT_GAMES" must be true');
        }

        // Test bosts must be created
        if (!await checkBots()) {
            ok = false;
            console.log('[FAIL] test bots missing, run: "yarn hex create-test-bots"');
        }

        // Result
        if (!ok) {
            throw new Error('Some requirements are not met');
        } else {
            console.log('OK.');
        }
    })
;

const checkBots = async (): Promise<boolean> => {
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

    const playerRepository = AppDataSource.getRepository(Player);

    if (null === await playerRepository.findOneBy({
        slug: 'test-determinist-instant',
    })) {
        return false;
    }

    if (null === await playerRepository.findOneBy({
        slug: 'test-determinist-wait',
    })) {
        return false;
    }

    return true;
};
