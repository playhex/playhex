import { Container } from 'typedi';
import logger from '../logger.js';
import { TournamentSeriesAutoCreate } from './TournamentSeriesAutoCreate.js';

/**
 * To call on server start.
 */
export const initTournamentSeriesAutoCreate = () => {
    logger.info('Tournament series auto create enabled');

    // Wait until server initialize, and tournaments are loaded in store
    setTimeout(() => {
        Container.get(TournamentSeriesAutoCreate).startWatchingSeries();
    }, 5000);
};
