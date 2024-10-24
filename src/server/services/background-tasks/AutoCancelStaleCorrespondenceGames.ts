import { Service } from 'typedi';
import HostedGameServer from '../../HostedGameServer';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils';
import logger from '../logger';

type GetGamesCallback = () => HostedGameServer[];

const { AUTO_CANCEL_STALE_CORRESPONDENCE_GAMES_AFTER } = process.env;

/**
 * Cancel a correspondence game when it has not ativity for too long.
 */
@Service()
export default class AutoCancelStaleCorrespondenceGames
{
    /**
     * @param autoCancelAfter In milliseconds, time to wait after last move before cancel.
     */
    constructor(
        private autoCancelAfter: number = AUTO_CANCEL_STALE_CORRESPONDENCE_GAMES_AFTER?.match(/^\d+$/)
            ? parseInt(AUTO_CANCEL_STALE_CORRESPONDENCE_GAMES_AFTER, 10)
            : -1
        ,
    ) {}

    /**
     * Start auto-cancelling stale correspondence game periodically.
     *
     * @param getGamesCallback A callback that returns all active games.
     *                         Needed to prevent circular dependencies when injecting whole HostedGameRepository.
     */
    start(getGamesCallback: GetGamesCallback): void
    {
        if (this.autoCancelAfter <= 0) {
            logger.info('Not starting auto cancel for correspondence games because disabled.');
            return;
        }

        logger.info('Starting auto cancel for correspondence games.', { autoCancelAfter: this.autoCancelAfter });

        this.run(getGamesCallback());
        setInterval(() => this.run(getGamesCallback()), 86400000);
    }

    /**
     * Auto cancel stale correspondence games now in a given list of game.
     */
    run(hostedGameServers: HostedGameServer[]): void
    {
        logger.info('Running auto cancel for correspondence games...');

        for (const hostedGameServer of hostedGameServers) {
            if (this.shouldAutoCancel(hostedGameServer)) {
                logger.info('Cancel correspondence game because no activity', { gameId: hostedGameServer.getId() });
                hostedGameServer.systemCancel();
            }
        }

        logger.info('Done: auto cancel for correspondence games.');
    }

    shouldAutoCancel(hostedGameServer: HostedGameServer): boolean
    {
        if ('correspondence' !== timeControlToCadencyName(hostedGameServer.getHostedGameOptions())) {
            return false;
        }

        if ('playing' !== hostedGameServer.getState()) {
            return false;
        }

        const game = hostedGameServer.getGame();
        const lastActivityAt = game?.getLastMoveAt() ?? game?.getStartedAt() ?? hostedGameServer.toData().createdAt;

        return new Date().valueOf() - lastActivityAt.valueOf() > this.autoCancelAfter;
    }
}
