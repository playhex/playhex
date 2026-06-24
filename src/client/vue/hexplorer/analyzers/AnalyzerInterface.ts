import { HexMove } from '../../../../shared/move-notation/hex-move-notation.js';

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

export interface AnalyzerInterface
{
    /**
     * Returns analysis for a position.
     * Given the engine features, can fill multiple optional analysis elements.
     */
    analyzePosition(input: AnalysisInput): Promise<AnalysisOutput>;

    /**
     * How it should be displayed to players in UI.
     */
    getName(): string;

    /**
     * Called when leaving the page, to persist whatever caching the analyzer uses.
     */
    persistCache?(): void;
}
