import type { Move } from '@playhex/move-notation';

/**
 * Line played by players that is not covered by puzzle tree,
 * see PuzzleMonitorUncoveredLine.
 */
export type PuzzleMonitorUncoveredLineCount = {
    /**
     * Moves played from initial position, last one is the uncovered move.
     */
    moves: Move[];

    /**
     * Number of players who played this line.
     */
    count: number;

    /**
     * Marked as false positive by author, hidden by default.
     */
    ignored: boolean;
};
