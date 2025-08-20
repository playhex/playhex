import { Container } from 'typedi';
import logger from '../../services/logger.js';
import { AutoCancelStaleGames } from './AutoCancelStaleGames.js';
import { AutoCancelCreatedGames } from './AutoCancelCreatedGames.js';

/**
 * To call on server start.
 */
export const initAutoCancelStaleGames = () => {
    const { AUTO_CANCEL_STALE_GAMES } = process.env;

    if (AUTO_CANCEL_STALE_GAMES !== 'true') {
        logger.info('Auto cancel stale games is disabled.');
        return;
    }

    logger.info('Auto cancel stale games enabled');

    // Wait until server initialize, then start checking for stale games
    setTimeout(() => {
        Container.get(AutoCancelStaleGames).startWatchingStaleGames(true);
        Container.get(AutoCancelCreatedGames).watchStaleCreatedGames();
    }, 5000);
};
