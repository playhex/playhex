import seedrandom from 'seedrandom';
import { Game, Move } from '../game-engine/index.js';

/**
 * Returns a random number in [0;1[
 * if determinist, return always same number for a given game position.
 */
const rand = (game: Game, determinist: boolean): number => {
    const rng = determinist
        ? seedrandom(game
            .getMovesHistory()
            .map(m => m.toString())
            .join(' '),
        )
        : seedrandom()
    ;

    return rng();
};

/**
 * Returns a random move to play on a given game.
 *
 * @param waitBeforePlay Time to wait in millisecond before return move. 0 to test concurrence, higher value to see coming.
 * @param determinist If random moves should be determinist. Bot will respond same as long as you play same moves.
 */
export const calcRandomMove = async (game: Game, waitBeforePlay = 0, determinist = false): Promise<Move> => {

    if (waitBeforePlay > 0) {
        await new Promise(resolve => {
            setTimeout(resolve, waitBeforePlay);
        });
    }

    // Swaps 30% times
    if (game.canSwapNow() && rand(game, determinist) < 0.3) {
        return Move.swapPieces();
    }

    const possibleMoves: Move[] = [];

    for (let row = 0; row < game.getSize(); ++row) {
        for (let col = 0; col < game.getSize(); ++col) {
            if (game.getBoard().getCell(row, col) === null) {
                possibleMoves.push(new Move(row, col));
            }
        }
    }

    if (possibleMoves.length === 0) {
        throw new Error('Cannot play a random move, no possible move');
    }

    return possibleMoves[Math.floor(rand(game, determinist) * possibleMoves.length)];
};
