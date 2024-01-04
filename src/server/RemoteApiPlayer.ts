import logger from './services/logger';
import AppPlayer from '../shared/app/AppPlayer';
import { IllegalMove, Move } from '../shared/game-engine';
import { v4 as uuidv4 } from 'uuid';
import HexRemotePlayerClient, { CalculateMoveRequest } from '../shared/hex-remote-player-api-client';

const noInputError = new Error('No player input, cannot continue');

export default class RemoteApiPlayer extends AppPlayer
{
    private hexRemotePlayerApi: HexRemotePlayerClient;

    constructor(
        private name: string,
        endpoint: string,
    ) {
        super({
            id: 'remote-api|' + uuidv4(),
            pseudo: name,
            isBot: true,
        });

        this.hexRemotePlayerApi = new HexRemotePlayerClient(endpoint);

        this.on('myTurnToPlay', () => this.makeMove());
    }

    getName(): string
    {
        return this.name;
    }

    private gameHistoryToApi(): string
    {
        if (!this.playerGameInput) {
            throw noInputError;
        }

        const moveHistory = this.playerGameInput
            .getMovesHistory()
            .map(move => move.toString())
        ;

        if (this.playerGameInput.hasSwapMove()) {
            moveHistory[1] = 'swap-pieces';
        }

        return moveHistory.join(' ');
    }

    private async fetchMove(): Promise<Move>
    {
        if (!this.playerGameInput) {
            throw noInputError;
        }

        const payload: CalculateMoveRequest = {
            game: {
                size: this.playerGameInput.getSize(),
                movesHistory: this.gameHistoryToApi(),
                currentPlayer: 0 === this.playerGameInput.getPlayerIndex() ? 'black' : 'white',
                swapRule: this.playerGameInput.getAllowSwap(),
            },
            ai: {
                engine: 'mohex',
                maxGames: 20,
            },
        };

        const moveString = await this.hexRemotePlayerApi.calculateMove(payload);

        try {
            if ('swap-pieces' === moveString) {
                const swapedMove = this.playerGameInput.getFirstMove();

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

    private async makeMove(): Promise<void>
    {
        if (!this.playerGameInput) {
            logger.error('Cannot call RemoteApiPlayer.makeMove(), not player game input.');
            throw noInputError;
        }

        try {
            const move = await this.fetchMove();
            this.playerGameInput.move(move);
        } catch (e) {
            this.playerGameInput.resign();

            logger.error('AI resigned because remote api did not provided a valid move.');

            if (e instanceof IllegalMove) {
                logger.error(e.message);
            }
        }
    }
}
