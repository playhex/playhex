import GameServer from '../../GameServer.js';
import { is1v1Game, isBotGame } from '../../../shared/app/gameUtils.js';
import { no, StaleEvaluatorResult, yes } from './StaleEvaluatorResult.js';
import { Service } from 'typedi';
import { timings } from './timings.js';
import { isPlayingAndEmpty, isTimingPast } from './utils.js';
import { isCorrespondence } from '../../../shared/app/timeControlUtils.js';

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
    isStale(gameServer: GameServer): StaleEvaluatorResult
    {
        const game = gameServer.getGame();
        const engineGame = gameServer.getEngineGame();

        // Do not mark tournament matches as stale
        if (game.tournamentMatch) {
            return no('this is a tournament game');
        }

        // bot game, empty
        if (isBotGame(game) && isPlayingAndEmpty(gameServer)) {
            const startedAt = engineGame!.getStartedAt();

            if (isTimingPast(startedAt, timings.emptyBotGame)) {
                return yes('bot game empty for too long', { startedAt });
            }

            return no('bot game empty, but timing still ok', { startedAt });
        }

        // 1v1, correspondence, empty
        if (is1v1Game(game) && isCorrespondence(game) && isPlayingAndEmpty(gameServer)) {
            const lastActivityAt = engineGame?.getLastMoveAt()
                ?? engineGame?.getStartedAt()
                ?? gameServer.getGame().createdAt
            ;

            if (isTimingPast(lastActivityAt, timings.empty1v1Correspondence)) {
                return yes('1v1 correspondence empty for too long', { lastActivityAt });
            }

            return no('1v1 correspondence empty, but timing still ok', { lastActivityAt });
        }

        if (is1v1Game(game) && !isCorrespondence(game)) {

            // 1v1, live, empty
            if (isPlayingAndEmpty(gameServer)) {
                const startedAt = engineGame!.getStartedAt();

                if (isTimingPast(startedAt, timings.empty1v1Live)) {
                    return yes('1v1 live empty for too long', { startedAt });
                }

                return no('1v1 live empty, but timing still ok', { startedAt });
            }

            // 1v1, live, created
            return no('1v1 live created are a special case, we need to listen for host connect/disconnect. Handled elsewhere');
        }

        return no('game is not in a configuration that may be stale', {
            is1v1: is1v1Game(game),
            isBot: isBotGame(game),
            isPlayingAndEmpty: isPlayingAndEmpty(gameServer),
            isCorrepondence: isCorrespondence(game),
        });
    }
}
