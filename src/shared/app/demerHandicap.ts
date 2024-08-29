import { HostedGame, Move } from './models';

/**
 * Guess Demer handicap from game options and pass moves.
 *
 * https://www.hexwiki.net/index.php/Handicap
 *
 * Returns:
 *  - 0: no handicap
 *  - "N/S": no-swap, not a handicap, just swap disabled but colors still random
 *  - number: Demer handicap
 */
export const guessDemerHandicap = (swapRule: boolean, firstPlayerPredefined: boolean, movesHistory?: Move[]): number | 'N/S' => {
    if (!swapRule) {
        if (!firstPlayerPredefined) {
            return 'N/S';
        }

        let handicap = 0.5;

        if (!movesHistory) {
            return handicap;
        }

        // Counting white pass moves
        for (let i = 1; i < movesHistory.length && 'pass' === movesHistory[i].specialMoveType; i += 2) {
            ++handicap;
        }

        return handicap;
    }

    if (!movesHistory) {
        return 0;
    }

    let handicap = 0;
    let consecutiveMoves = 0;

    // Counting pass moves in first moves
    for (let i = 1; i < movesHistory.length && consecutiveMoves < 2; ++i) {
        const { specialMoveType } = movesHistory[i];

        if (undefined === specialMoveType) {
            ++consecutiveMoves;
        }

        if ('pass' === specialMoveType) {
            consecutiveMoves = 0;

            if (0 === (i % 2)) {
                --handicap;
            } else {
                ++handicap;
            }
        }
    }

    return handicap;
};

export const guessDemerHandicapFromHostedGame = (hostedGame: HostedGame): number | 'N/S' => {
    return guessDemerHandicap(
        hostedGame.gameOptions.swapRule,
        null !== hostedGame.gameOptions.firstPlayer,
        hostedGame.gameData?.movesHistory,
    );
};
