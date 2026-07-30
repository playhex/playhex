import type { CanonicalPosition } from './position-comparator.js';

/**
 * Minimum Jaccard similarity to consider two positions as the same one.
 * Higher: may miss similar positions.
 * Lower: may flag positions that are not really similar.
 */
export const SIMILARITY_THRESHOLD = 0.8;

/**
 * Minimum number of common stones to flag a position.
 * Below, positions are too small (common openings), and are never flagged.
 */
export const MIN_COMMON_STONES = 8;

export type Similarity = {
    /**
     * Jaccard index, from 0 (no common stone) to 1 (same position).
     */
    similarity: number;

    /**
     * Number of stones on same cell and same color in both positions.
     */
    common: number;
};

/**
 * Jaccard index: |A ∩ B| / |A ∪ B|,
 * where A and B are sets of stones (color + cell).
 */
export const similarityFromCounts = (common: number, countA: number, countB: number): Similarity => {
    const union = countA + countB - common;

    return {
        similarity: union === 0 ? 0 : common / union,
        common,
    };
};

/**
 * Best Jaccard index two positions can reach,
 * knowing only their number of stones.
 * Used to skip positions that cannot be similar enough, without comparing stones.
 */
export const maxPossibleSimilarity = (countA: number, countB: number): number => {
    const max = Math.max(countA, countB);

    return max === 0 ? 0 : Math.min(countA, countB) / max;
};

export const countStones = (position: CanonicalPosition): number => position.black.length + position.white.length;

/**
 * Whether a similarity is high enough to flag the position.
 */
export const isSimilarEnough = ({ similarity, common }: Similarity): boolean => {
    return similarity >= SIMILARITY_THRESHOLD
        && common >= MIN_COMMON_STONES
    ;
};
