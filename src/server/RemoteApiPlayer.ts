import logger from './services/logger';
import { Game, IllegalMove, Move, PlayerIndex } from '../shared/game-engine';
import HexRemotePlayerClient, { CalculateMoveRequest } from '../shared/hex-remote-player-api-client';
import { TimeMeasureMetric } from './services/metrics';
import Container from 'typedi';

export default class RemoteApiPlayer
{
    private hexRemotePlayerApi: HexRemotePlayerClient;

    constructor(
        endpoint: string,
    ) {
        this.hexRemotePlayerApi = new HexRemotePlayerClient(endpoint);
    }

    private async fetchMove(game: Game): Promise<Move>
    {
        const moveHistory = game
            .getMovesHistory()
            .map(move => move.toString())
        ;

        if (game.hasSwapMove()) {
            moveHistory[1] = 'swap-pieces';
        }

        const payload: CalculateMoveRequest = {
            game: {
                size: game.getSize(),
                movesHistory: moveHistory.join(' '),
                currentPlayer: 0 === game.getCurrentPlayerIndex() ? 'black' : 'white',
                swapRule: game.getAllowSwap(),
            },
            ai: {
                engine: 'mohex',
                maxGames: 20,
            },
        };

        const moveString = await this.hexRemotePlayerApi.calculateMove(payload);

        try {
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
            logger.error(`Unexpected remote player move: "${moveString}"`);
            throw new Error(e);
        }
    }

    async makeMove(game: Game, playerIndex: PlayerIndex): Promise<void>
    {
        const measure = new TimeMeasureMetric('ai_time_to_respond', {
            engine: 'mohex',
            level: 20,
            boardsize: game.getSize(),
        });

        try {
            const move = await this.fetchMove(game);
            game.move(move, playerIndex);
            measure.finished();
        } catch (e) {
            game.resign(playerIndex);

            logger.error('AI resigned because remote api did not provided a valid move.');

            if (e instanceof IllegalMove) {
                logger.error(e.message);
            }

            measure.finished(false);
        }
    }
}

const { HEX_AI_API_ENDPOINT } = process.env;

if (HEX_AI_API_ENDPOINT) {
    Container.set(RemoteApiPlayer, new RemoteApiPlayer(HEX_AI_API_ENDPOINT));
}
