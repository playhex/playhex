import { State } from './createState.js';
import { moveToString, WHO_BLUE, WHO_RED } from './utils.js';

/**
 * @param {Number} redOrBlue Color of player on which get best move, use 'red' or 'blue'
 * @param {String[]} movesHistory Moves history played so far, like ['a1', 'b2', ...]
 * @param {Number} level AI level from 1 to 10
 *
 * @returns {String} Best move as string, like "d4"
 */
export const getBestMove = (redOrBlue: 'red' | 'blue', movesHistory: string[], level: number): string => {
    const state = new State(level, movesHistory ?? []);

    if (!level) {
        level = 10;
    }

    let who = null;

    if (redOrBlue === 'red') {
        who = WHO_RED;
    } else if (redOrBlue === 'blue') {
        who = WHO_BLUE;
    }

    if (who === null) {
        throw new Error('redOrBlue must be either "red" or "blue"');
    }

    const bestMove = state.getBestMove(redOrBlue, level);

    return moveToString(bestMove as [number, number]);
};
