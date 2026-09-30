import { getBestMove, WHO_BLUE, WHO_RED } from 'davies-hex-ai';
import type { LocalProcessor } from './InMemoryAiJobQueue.js';

/**
 * Davies is lightweight and written in javascript,
 * so it can run in this process when there is no remote worker (development).
 */
export const processDavies: LocalProcessor = task => {
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
