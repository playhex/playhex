import { getBestMove, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import type { EmbeddedProcessor } from './EmbeddedAiWorker.js';

/**
 * Davies is lightweight (a few ms per move) and written in javascript,
 * so it can run in this process, see EmbeddedAiWorker.
 */
export const processDavies: EmbeddedProcessor = task => {
    if (task.type !== 'davies') {
        throw new Error(`Davies cannot process task "${task.type}"`);
    }

    const { game, level } = task.data;

    return Promise.resolve(getBestMove(
        game.currentPlayer === 'black' ? WHO_RED : WHO_BLUE,
        game.movesHistory.split(' ').filter(move => move !== ''),
        level,
    ));
};
