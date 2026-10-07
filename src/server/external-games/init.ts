import { Container } from 'typedi';
import LittleGolemClient, { littleGolemClient } from '../../shared/app/little-golem/LittleGolemClient.js';
import ExternalGameImportWorker from './ExternalGameImportWorker.js';
import logger from '../services/logger.js';

/**
 * To call on server start.
 */
export const initExternalGames = (): void => {
    // Same instance as LittleGolemLink, to share throttling
    Container.set(LittleGolemClient, littleGolemClient);

    if (!ExternalGameImportWorker.isEnabled()) {
        logger.info('External game import is disabled.');
        return;
    }

    logger.info('External game import enabled');

    Container.get(ExternalGameImportWorker).start();
};
