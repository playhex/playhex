import Move from './Move';
import Player from './Player';

const { floor, random } = Math;

export default class RandomAIPlayer extends Player
{
    private static WAIT_BEFORE_PLAY = 1;

    constructor()
    {
        super();

        this.on('myTurnToPlay', () => {
            this.makeMove();
        });

        this.setReady();
    }

    getName(): string
    {
        return 'Random bot';
    }

    async makeMove(): Promise<void>
    {
        console.log('random AI player is playing...');

        if (RandomAIPlayer.WAIT_BEFORE_PLAY > 0) {
            await new Promise(resolve => {
                setTimeout(resolve, RandomAIPlayer.WAIT_BEFORE_PLAY);
            });
        }

        if (null === this.playerGameInput) {
            throw new Error('Cannot move, no player game input provided.');
        }

        const possibleMoves: Move[] = [];

        for (let row = 0; row < this.playerGameInput.getSize(); ++row) {
            for (let col = 0; col < this.playerGameInput.getSize(); ++col) {
                if (null === this.playerGameInput.getHex(row, col)) {
                    possibleMoves.push(new Move(row, col));
                }
            }
        }

        const move = possibleMoves[floor(random() * possibleMoves.length)];

        console.log('random AI player plays ' + move);

        this.playerGameInput.move(move);
    }
}
