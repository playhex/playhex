import type { AnalysisInput, AnalysisOutput } from '../../../../shared/app/hexplorer.js';

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
