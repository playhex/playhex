import { Container } from 'typedi';
import { notifier } from '../services/notifications/notifier.js';
import { Game } from '../../shared/app/models/index.js';
import LadderService from './LadderService.js';
import logger from '../services/logger.js';
import { errorToLogger } from '../../shared/app/utils.js';

/**
 * Applies ladder results as soon as a ladder game ends or is canceled.
 */
export const listenLadderGames = (): void => {
    const onGameOver = (game: Game): void => {
        if (!game.ladderChallenge) {
            return;
        }

        Container.get(LadderService).onGameOver(game).catch(e => {
            logger.error('Ladder: could not apply game result', { gamePublicId: game.publicId, ...errorToLogger(e) });
        });
    };

    notifier.on('gameEnd', onGameOver);
    notifier.on('gameCanceled', onGameOver);
};
