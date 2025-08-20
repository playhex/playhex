import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { GameStaleEvaluator } from './GameStaleEvaluator.js';
import logger from '../logger.js';

/**
 * Will loop over all active games, evaluate if a game is stale,
 * and can cancel it.
 * Can watch continuously for stale games.
 */
@Service()
export class AutoCancelStaleGames
{
    /**
     * In milliseconds, how many time wait before looping into all active games to check staleness.
     * Should be a value high enough to not loop too often,
     * but low enough to keep an acceptable granularity, given values in timings.ts
     */
    private CHECK_STALE_GAMES_EVERY = 60 * 5 * 1000;

    private intervalThread: null | NodeJS.Timeout = null;

    constructor(
        private hostedGameRepository: HostedGameRepository,
        private gameStaleEvaluator: GameStaleEvaluator,
    ) {}

    /**
     * Loop into active games to cancel stale ones.
     * Will do this now, and periodically.
     * Only from game state, not from players connected/disconnected.
     */
    startWatchingStaleGames(cancelStaleGames = false): void
    {
        if (this.intervalThread !== null) {
            logger.warning('Calling startWatchingStaleGames() but already watching');
            return;
        }

        this.checkAllGames(cancelStaleGames);
        this.intervalThread = setInterval(
            () => this.checkAllGames(cancelStaleGames),
            this.CHECK_STALE_GAMES_EVERY,
        );
    }

    stopWatchingStaleGames(): void
    {
        if (this.intervalThread === null) {
            logger.warning('Calling stopWatchingStaleGames() but not watching');
            return;
        }

        clearInterval(this.intervalThread);
        this.intervalThread = null;
    }

    /**
     * Check all active games,
     * and decides whether we should auto-cancel game.
     */
    checkAllGames(cancelStaleGames = false): object[]
    {
        const activeGames = this.hostedGameRepository.getActiveGames();
        const reasons: object[] = [];

        logger.debug('Check all active games staleness', {
            count: Object.keys(activeGames).length,
            cancelStaleGames,
        });

        for (const publicId in activeGames) {
            const activeGame = activeGames[publicId];
            const result = this.gameStaleEvaluator.isStale(activeGame);

            if (result.shouldCancel && cancelStaleGames) {
                logger.info('Detected a stale game, cancel it', {
                    hostedGamePublicId: activeGame.getPublicId(),
                    ...result,
                });

                activeGame.systemCancel();
            }

            reasons.push({
                hostedGamePublicId: activeGame.getPublicId(),
                url: `${process.env.BASE_URL ?? ''}/games/${activeGame.getPublicId()}`,
                ...result,
            });
        }

        return reasons;
    }
}
