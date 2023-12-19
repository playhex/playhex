import seedrandom from 'seedrandom';
import Move from './Move';
import AppPlayer from '../app/AppPlayer';
import { v4 as uuidv4 } from 'uuid';

const { floor } = Math;

/**
 * AI that plays randomly, but determinist:
 * if you play same moves, AI will also responds with same moves.
 */
export default class DeterministRandomAIPlayer extends AppPlayer
{
    private static NAME = 'Determinist random bot';

    constructor(
        /**
         * This bot plays instantly.
         * 0 is good for testing race condition (emit started/moved events in good order).
         * A higher value is good for having time while testing, or let user to see move happening.
         */
        private waitBeforePlay = 0,
    ) {
        super({
            id: 'determinist-random-bot|' + uuidv4(),
            pseudo: DeterministRandomAIPlayer.NAME,
            isBot: true,
        });

        this.on('myTurnToPlay', () => {
            this.makeMove();
        });
    }

    getName(): string
    {
        return DeterministRandomAIPlayer.NAME;
    }

    async makeMove(): Promise<void>
    {
        if (this.waitBeforePlay > 0) {
            await new Promise(resolve => {
                setTimeout(resolve, this.waitBeforePlay);
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
