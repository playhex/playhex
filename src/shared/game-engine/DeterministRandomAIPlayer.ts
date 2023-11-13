import seedrandom from 'seedrandom';
import Move from './Move';
import Player from './Player';

const { floor } = Math;

/**
 * AI that plays randomly, but determinist:
 * if you play same moves, AI will also responds with same moves.
 */
export default class DeterministRandomAIPlayer extends Player
{
    private static WAIT_BEFORE_PLAY = 40;

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
        return 'Determinist random bot';
    }

    async makeMove(): Promise<void>
    {
        if (DeterministRandomAIPlayer.WAIT_BEFORE_PLAY > 0) {
            await new Promise(resolve => {
                setTimeout(resolve, DeterministRandomAIPlayer.WAIT_BEFORE_PLAY);
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

        const rng = seedrandom(this.playerGameInput
            .getMovesHistory()
            .map(m => m.toString())
            .join(' ')
        );

        const move = possibleMoves[floor(rng() * possibleMoves.length)];

        this.playerGameInput.move(move);
    }
}
