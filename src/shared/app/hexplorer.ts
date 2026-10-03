import type { HexMove } from '@playhex/move-notation';
import { MCTS_PLAYOUTS } from './mctsSettings.js';

/**
 * Engine used by server to analyze a position.
 * Intuition: raw neural network output. MCTS: tree search, playouts set by server.
 */
export const ANALYSIS_ENGINES = ['katahex-intuition', 'katahex-mcts'] as const;

export type AnalysisEngine = typeof ANALYSIS_ENGINES[number];

/**
 * No worker online can analyze positions with the requested engine.
 */
export class AnalysisEngineUnavailableError extends Error {}

export type AnalysisInput = {
    size: number;
    color: 'black' | 'white';
    black: string[];
    white: string[];

    /**
     * Defaults to katahex-intuition.
     */
    engine?: AnalysisEngine;
};

export type AnalysisOutput = {
    whiteWin?: number;
    policy?: number[][];

    /**
     * Move the engine recommends to play for the position's player to move,
     * or null/undefined if it has no recommendation (e.g a noop engine, or no legal move).
     * Used by auto-play.
     */
    recommendedMove?: null | HexMove;
};

/**
 * Stable cache key for a position: sorts stone lists so iteration order doesn't matter.
 */
export function analysisCacheKey(input: AnalysisInput): string
{
    const black = [...input.black].sort();
    const white = [...input.white].sort();
    const key = [input.size, input.color, black.join(','), white.join(',')].join('|');

    // Keep intuition keys unchanged to not invalidate existing caches
    if (input.engine === undefined || input.engine === 'katahex-intuition') {
        return key;
    }

    // Playouts in key to not reuse results computed with other playouts, after MCTS_PLAYOUTS changed
    return `${input.engine}|${MCTS_PLAYOUTS}|${key}`;
}
