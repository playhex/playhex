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
    // destroy() force-exits the process, see patchAppDataSourceDestroy()
    await AppDataSource.destroy();
}

process.exit(0);
