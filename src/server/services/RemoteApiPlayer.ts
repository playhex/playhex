import logger from './logger.js';
import { EngineGame, IllegalMove } from '../../shared/game-engine/index.js';
import { TimeMeasureMetric } from './metrics.js';
import { Service } from 'typedi';
import GameServer from '../GameServer.js';
import { HexMove, isMoveValid } from '@playhex/move-notation';
import AiJobService from '../ai-jobs/AiJobService.js';
import { createBotMoveTask } from '../ai-jobs/botTasks.js';
import { timeValueToMilliseconds } from '../../shared/time-control/TimeValue.js';

@Service()
export default class RemoteApiPlayer
{
    constructor(
        private aiJobService: AiJobService,
    ) {}

    /**
     * Remaining time on bot clock, to not wait for a move once bot lost on time.
     */
    private getRemainingTimeMs(gameServer: GameServer): undefined | number
    {
        const timeControl = gameServer.getGame().timeControl;

        if (!timeControl) {
            return undefined;
        }

        const remainingTimeMs = timeValueToMilliseconds(timeControl.players[timeControl.currentPlayer].totalRemainingTime, new Date());

        return remainingTimeMs > 0 ? remainingTimeMs : undefined;
    }

    /**
     * @param allowSwap Override game swap rule, i.e to prevent engine from swapping.
     */
    private async fetchMove(engine: string, game: EngineGame, config: { [key: string]: unknown }, remainingTimeMs?: number, allowSwap = game.getAllowSwap()): Promise<HexMove>
    {
        let moveString: null | string = null;

        try {
            const task = createBotMoveTask(engine, config, {
                size: game.getSize(),
                movesHistory: game.getMovesHistoryAsString(),
                currentPlayer: game.getCurrentPlayerIndex() === 0 ? 'black' : 'white',
                swapRule: allowSwap,
            });

            if (task === null) {
                throw new Error(`Engine "${engine}" is not computed by AI workers`);
            }

            moveString = await this.aiJobService.calculateMove(task, remainingTimeMs);

            if (moveString === 'resign') {
                throw new Error('ok, remote player expressely resigned.');
            }

            if (!isMoveValid(moveString)) {
                throw new Error('Invalid move: ' + moveString);
            }

            return moveString;
        } catch (e) {
            logger.error(`Unexpected remote player move: "${moveString ?? '(api error)'}"`, { error: e.message });
            throw new Error(e);
        }
    }

    /**
     * @param allowSwap Override game swap rule, i.e to prevent engine from swapping.
     */
    async makeMove(engine: string, gameServer: GameServer, config: { maxGames?: number, maxPlayouts?: number }, allowSwap?: boolean): Promise<null | HexMove>
    {
        const engineGame = gameServer.getEngineGame();

        if (engineGame === null) {
            throw new Error('Cannot send move request to api, no game');
        }

        const measure = new TimeMeasureMetric('ai_time_to_respond', {
            engine,
            level: config.maxGames ?? config.maxPlayouts ?? 0,
            boardsize: engineGame.getSize(),
            gameId: gameServer.getPublicId(),
        });

        try {
            const move = await this.fetchMove(engine, engineGame, config, this.getRemainingTimeMs(gameServer), allowSwap);
            measure.finished();
            return move;
        } catch (e) {
            logger.error('AI resigned because remote api did not provided a valid move.', { message: e.message });

            if (e instanceof IllegalMove) {
                logger.error('Illegal move', { msg: e.message });
            }

            measure.finished(false);
            return null;
        }
    }
}
