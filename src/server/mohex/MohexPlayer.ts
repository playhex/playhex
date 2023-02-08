import { Move, Player, PlayerGameInput } from '../../shared/game-engine';
import QueueableMohex from '../mohex-cli/QueueableMohex';

const noInputError = new Error('No player input, cannot continue');

/**
 * A hex player that use Mohex program to perform its moves.
 */
export default class MohexPlayer extends Player
{
    constructor(
        private queueableMohex: QueueableMohex,
    ) {
        super();

        this.on('myTurnToPlay', () => {
            this.makeMove();
        });
    }

    async setPlayerGameInput(playerGameInput: PlayerGameInput): Promise<void>
    {
        super.setPlayerGameInput(playerGameInput);
        this.setReady();
    }

    getName(): string
    {
        return 'Mohex';
    }

    async makeMove(): Promise<void>
    {
        console.log('Queuing move generation task...');

        const mohexMovePromise = this.queueableMohex.queueCommand<string>(async (mohex) => {
            console.log('Mohex is playing...');

            if (null === this.playerGameInput) {
                throw noInputError;
            }

            await mohex.setBoardSize(this.playerGameInput.getSize());
            await mohex.playGame(this.playerGameInput.getMovesHistory().join(' '));

            console.log(`calcaluating next move for ${this.getColor()}...`);

            return await mohex.generateMove(this.getColor());
        });

        let mohexMove: string;

        try {
            mohexMove = await mohexMovePromise;
        } catch (e) {
            throw new Error('Mohex command error: ' + e);
        }

        const match = mohexMove.match(/^([a-z])(\d+)$/);

        if (null === match) {
            throw new Error('Unexpected mohex output: ' + mohexMove);
        }

        const [, letter, number] = match;

        const move = new Move(
            letter.charCodeAt(0) - 97, // "a" is 0
            parseInt(number, 10) - 1, // "1" is 0
        );

        if (null === this.playerGameInput) {
            throw noInputError;
        }

        this.playerGameInput.move(move);
    }

    private getColor(): 'black' | 'white'
    {
        if (null === this.playerGameInput) {
            throw noInputError;
        }

        return 0 === this.playerGameInput.getPlayerIndex()
            ? 'black'
            : 'white'
        ;
    }
}
