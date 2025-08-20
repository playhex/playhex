import HostedGameServer from '../../HostedGameServer.js';
import { is1v1Game, isBotGame, isCorrespondenceGame } from '../../../shared/app/hostedGameUtils.js';
import { no, StaleEvaluatorResult, yes } from './StaleEvaluatorResult.js';
import { Service } from 'typedi';
import { timings } from './timings.js';
import { isPlayingAndEmpty, isTimingPast } from './utils.js';

/**
 * Take a single game, and evaluates, from its state,
 * whether it is stale or not.
 * Also returns the reason.
 *
 * Evaluates only from game state:
 * does not takes into account player online status.
 */
@Service()
export class GameStaleEvaluator
{
    isStale(hostedGameServer: HostedGameServer): StaleEvaluatorResult
    {
        const hostedGame = hostedGameServer.getHostedGame();
        const game = hostedGameServer.getGame();

        // Do not mark tournament matches as stale
        if (hostedGame.tournamentMatch) {
            return no('this is a tournament game');
        }

        // bot game, empty
        if (isBotGame(hostedGame) && isPlayingAndEmpty(hostedGameServer)) {
            const startedAt = game!.getStartedAt();

            if (isTimingPast(startedAt, timings.emptyBotGame)) {
                return yes('bot game empty for too long', { startedAt });
            }

            return no('bot game empty, but timing still ok', { startedAt });
        }

        // 1v1, correspondence, empty
        if (is1v1Game(hostedGame) && isCorrespondenceGame(hostedGame) && isPlayingAndEmpty(hostedGameServer)) {
            const lastActivityAt = game?.getLastMoveAt()
                ?? game?.getStartedAt()
                ?? hostedGameServer.getHostedGame().createdAt
            ;

            if (isTimingPast(lastActivityAt, timings.empty1v1Correspondence)) {
                return yes('1v1 correspondence empty for too long', { lastActivityAt });
            }

            return no('1v1 correspondence empty, but timing still ok', { lastActivityAt });
        }

        if (is1v1Game(hostedGame) && !isCorrespondenceGame(hostedGame)) {

            // 1v1, live, empty
            if (isPlayingAndEmpty(hostedGameServer)) {
                const startedAt = game!.getStartedAt();

                if (isTimingPast(startedAt, timings.empty1v1Live)) {
                    return yes('1v1 live empty for too long', { startedAt });
                }

                return no('1v1 live empty, but timing still ok', { startedAt });
            }

            // 1v1, live, created
            return no('1v1 live created are a special case, we need to listen for host connect/disconnect. Handled elsewhere');
        }

        return no('game is not in a configuration that may be stale', {
            is1v1: is1v1Game(hostedGame),
            isBot: isBotGame(hostedGame),
            isPlayingAndEmpty: isPlayingAndEmpty(hostedGameServer),
            isCorrepondence: isCorrespondenceGame(hostedGame),
        });
    }
}
