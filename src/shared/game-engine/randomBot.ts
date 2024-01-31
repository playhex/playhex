import seedrandom from 'seedrandom';
import { Game, Move } from '../game-engine';

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

    const possibleMoves: Move[] = [];

    for (let row = 0; row < game.getSize(); ++row) {
        for (let col = 0; col < game.getSize(); ++col) {
            if (null === game.getBoard().getCell(row, col)) {
                possibleMoves.push(new Move(row, col));
            }
        }
    }

    if (0 === possibleMoves.length) {
        throw new Error('Cannot play a random move, no possible move');
    }

    const rng = determinist
        ? seedrandom(game
            .getMovesHistory()
            .map(m => m.toString())
            .join(' ')
        )
        : seedrandom()
    ;

    return possibleMoves[Math.floor(rng() * possibleMoves.length)];
};
