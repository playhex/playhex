import { Container } from 'typedi';
import LadderService from './LadderService.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';
import { listenLadderGames } from './LadderGameListener.js';

const CHECK_EVERY_MS = 10 * 60 * 1000;

/**
 * To call on server start.
 *
 * - listens ladder games to apply results
 * - applies results of games that ended while server was down
 * - periodically starts games of expired live proposals, and removes inactive players
 */
export const initLadder = (): void => {
    listenLadderGames();

    const ladderService = Container.get(LadderService);

    const iterate = async (): Promise<void> => {
        try {
            await ladderService.startExpiredLiveProposals();
            await ladderService.removeInactivePlayers();
        } catch (e) {
            logger.error('Ladder: error in periodic check', errorToLogger(e));
        }
    };

    // Wait until server initialize, and active games are loaded in store
    setTimeout(() => {
        ladderService.applyMissedResults()
            .catch(e => logger.error('Ladder: error while applying missed results', errorToLogger(e)))
            .finally(() => void iterate())
        ;

        setInterval(() => void iterate(), CHECK_EVERY_MS);
    }, 5000);
};
