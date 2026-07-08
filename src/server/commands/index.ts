import hexProgram from './hexProgram.js';
import { AppDataSource } from '../data-source.js';

import './createRandomBotsCommand.js';
import './createMohexBotsCommand.js';
import './createKatahexBotsCommand.js';
import './createDaviesBotsCommand.js';
import './createTestBotsCommand.js';
import './anonymizeDB.js';
import './checkDbInconsistencies.js';
import './calculateRatings.js';
import './exportGamesCommand.js';
import './checkTestsRequirements.js';
import './migrateCypressFixtures.js';
import './missingTranslationsCommand.js';
import './createFakeNotificationsCommand.js';

await hexProgram.parseAsync();

if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
}

/*
 * mysql2 pool.end() sends a QUIT command to each pooled connection and waits
 * for the server response before closing the socket, which does not reliably
 * settle in a short-lived CLI process. Force exit once cleanup is done.
 */
process.exit(0);
