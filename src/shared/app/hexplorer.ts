import type { HexMove } from '../move-notation/hex-move-notation.js';

export type AnalysisInput = {
    size: number;
    color: 'black' | 'white';
    black: string[];
    white: string[];
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
    return [input.size, input.color, black.join(','), white.join(',')].join('|');
}
