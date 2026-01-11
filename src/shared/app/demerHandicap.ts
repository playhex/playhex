import { Move } from '../move-notation/move-notation.js';
import { HostedGame } from './models/index.js';

/**
 * Guess Demer handicap from game options and pass moves.
 *
 * https://www.hexwiki.net/index.php/Handicap
 *
 * @returns Demer handicap:
 *  - 0: no handicap
 *  - "N/S": no-swap, not a handicap, just swap disabled but colors still random
 *  - number: Demer handicap
 *
 * @param swapRule Whether swap is enabled
 * @param firstPlayerPredefined Whether first player is pre-defined, false if first player is random
 * @param moves Played moves. If not provided, assume the game is empty, and returns a provisional handicap based on game settings
 */
export const guessDemerHandicap = (swapRule: boolean, firstPlayerPredefined: boolean, moves?: Move[]): number | 'N/S' => {
    if (!swapRule) {
        if (!firstPlayerPredefined) {
            return 'N/S';
        }

        let handicap = 0.5;

        if (!moves) {
            return handicap;
        }

        // Counting white pass moves
        for (let i = 1; i < moves.length && moves[i] === 'pass'; i += 2) {
            ++handicap;
        }

        return handicap;
    }

    if (!moves) {
        return 0;
    }

    let handicap = 0;
    let consecutiveMoves = 0;

    // Counting pass moves in first moves
    for (let i = 1; i < moves.length && consecutiveMoves < 2; ++i) {
        if (moves[i] === 'pass') {
            consecutiveMoves = 0;

            if ((i % 2) === 0) {
                --handicap;
            } else {
                ++handicap;
            }

            continue;
        }

        if (moves[i] === 'swap-pieces') {
            continue;
        }

        ++consecutiveMoves;
    }

    return handicap;
};

export const guessDemerHandicapFromHostedGame = (hostedGame: HostedGame): number | 'N/S' => {
    return guessDemerHandicap(
        hostedGame.swapRule,
        hostedGame.firstPlayer !== null,
        hostedGame.moves,
    );
};
