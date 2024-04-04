import logger from './logger';
import { Game, IllegalMove, Move } from '../../shared/game-engine';
import HexAiApiClient, { CalculateMoveRequest } from './HexAiApiClient';
import { TimeMeasureMetric } from './metrics';
import { Service } from 'typedi';
import HostedGame from '../HostedGame';

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
                currentPlayer: 0 === game.getCurrentPlayerIndex() ? 'black' : 'white',
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

            if ('swap-pieces' === moveString) {
                const swapedMove = game.getFirstMove();

                if (null === swapedMove) {
                    throw new Error('"swap-pieces" only available on first move');
                }

                return swapedMove.clone();
            }

            if ('resign' === moveString) {
                throw new Error('ok, remote player expressely resigned.');
            }

            return Move.fromString(moveString);
        } catch (e) {
            logger.error(`Unexpected remote player move: "${moveString ?? '(api error)'}"`);
            throw new Error(e);
        }
    }

    async makeMove(engine: string, hostedGame: HostedGame, config: { [key: string]: unknown }): Promise<null | Move>
    {
        const game = hostedGame.getGame();

        if (null === game) {
            throw new Error('Cannot send move request to api, no game');
        }

        const measure = new TimeMeasureMetric('ai_time_to_respond', {
            engine,
            level: 20,
            boardsize: game.getSize(),
            gameId: hostedGame.getId(),
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
