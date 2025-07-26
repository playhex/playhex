import logger from './logger.js';
import { Game, IllegalMove, Move } from '../../shared/game-engine/index.js';
import HexAiApiClient, { CalculateMoveRequest } from './HexAiApiClient.js';
import { TimeMeasureMetric } from './metrics.js';
import { Service } from 'typedi';
import HostedGameServer from '../HostedGameServer.js';

@Service()
export default class RemoteApiPlayer
{
    constructor(
        private hexRemotePlayerApi: HexAiApiClient,
    ) {}

    private async fetchMove(engine: string, game: Game, config: { [key: string]: unknown }): Promise<Move>
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

            if (moveString === 'swap-pieces') {
                return Move.swapPieces();
            }

            if (moveString === 'resign') {
                throw new Error('ok, remote player expressely resigned.');
            }

            return Move.fromString(moveString);
        } catch (e) {
            logger.error(`Unexpected remote player move: "${moveString ?? '(api error)'}"`, { error: e.message });
            throw new Error(e);
        }
    }

    async makeMove(engine: string, hostedGameServer: HostedGameServer, config: { maxGames?: number, treeSearch?: boolean }): Promise<null | Move>
    {
        const game = hostedGameServer.getGame();

        if (game === null) {
            throw new Error('Cannot send move request to api, no game');
        }

        const measure = new TimeMeasureMetric('ai_time_to_respond', {
            engine,
            level: config.maxGames ?? (config.treeSearch ? 500000 : 0) ?? -1,
            boardsize: game.getSize(),
            gameId: hostedGameServer.getPublicId(),
        });

        try {
            const move = await this.fetchMove(engine, game, config);
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
