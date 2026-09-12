import logger from './logger.js';
import { EngineGame, IllegalMove } from '../../shared/game-engine/index.js';
import HexAiApiClient, { CalculateMoveRequest } from './HexAiApiClient.js';
import { TimeMeasureMetric } from './metrics.js';
import { Service } from 'typedi';
import GameServer from '../GameServer.js';
import { HexMove, isMoveValid } from '../../shared/move-notation/hex-move-notation.js';

@Service()
export default class RemoteApiPlayer
{
    constructor(
        private hexRemotePlayerApi: HexAiApiClient,
    ) {}

    private async fetchMove(engine: string, game: EngineGame, config: { [key: string]: unknown }): Promise<HexMove>
    {
        const payload: CalculateMoveRequest = {
            game: {
                size: game.getSize(),
                movesHistory: game.getMovesHistoryAsString(),
                currentPlayer: game.getCurrentPlayerIndex() === 0 ? 'black' : 'white',
                swapRule: game.getAllowSwap(),
            },
            ai: {
                ...config,
                engine,
            },
        };

        let moveString: null | string = null;

        try {
            moveString = await this.hexRemotePlayerApi.calculateMove(payload);

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

    async makeMove(engine: string, gameServer: GameServer, config: { maxGames?: number, treeSearch?: boolean }): Promise<null | HexMove>
    {
        const engineGame = gameServer.getEngineGame();

        if (engineGame === null) {
            throw new Error('Cannot send move request to api, no game');
        }

        const measure = new TimeMeasureMetric('ai_time_to_respond', {
            engine,
            level: config.maxGames ?? (config.treeSearch ? 500000 : 0),
            boardsize: engineGame.getSize(),
            gameId: gameServer.getPublicId(),
        });

        try {
            const move = await this.fetchMove(engine, engineGame, config);
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
