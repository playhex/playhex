import { Game } from '../game-engine/index.js';

/**
 * Number of consecutive pass moves allowed in a game.
 * Passing again would fail.
 */
export const MAX_CONSECUTIVE_PASSES = 2;

/**
 * Checks that players are not passing infinitely.
 *
 * Whether it is possible to play a pass move now in this game,
 * given its moves history.
 */
export const canPassAgain = (game: Game): boolean => {
    const movesHistory = game.getMovesHistory();
    const { length } = movesHistory;

    if (length < MAX_CONSECUTIVE_PASSES) {
        return true;
    }

    for (let i = 0; i < MAX_CONSECUTIVE_PASSES; ++i) {
        if (movesHistory[length - i - 1].getSpecialMoveType() !== 'pass') {
            return true;
        }
    }

    return false;
};
