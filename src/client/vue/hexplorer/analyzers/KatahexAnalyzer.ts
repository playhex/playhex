import { analysisCacheKey, type AnalysisEngine, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { LocalStorageCache } from '../services/cachedAnalysis.js';
import { AnalyzerInterface } from './AnalyzerInterface.js';
import { apiPostHexplorerAnalyzePosition } from '../../../apiClient.js';
import { bestMoveFromPolicy } from '../../../../shared/app/hexplorerLive.js';

/**
 * Analyze positions with Katahex on server.
 * With tree search engine, policy is the share of visits of each cell.
 */
export class KatahexAnalyzer implements AnalyzerInterface
{
    private cache: LocalStorageCache<AnalysisOutput>;

    /**
     * @param cacheName Local storage key, one per engine.
     */
    constructor(
        readonly engine: AnalysisEngine,
        private name: string,
        cacheName: string,
    ) {
        this.cache = new LocalStorageCache<AnalysisOutput>(cacheName);
    }

    async analyzePosition(input: AnalysisInput): Promise<AnalysisOutput>
    {
        input = { ...input, engine: this.engine };

        const cacheKey = analysisCacheKey(input);
        return await this.cache.getItem(cacheKey, () => this.fetchPositionAnalyze(input));
    }

    getName(): string
    {
        return this.name;
    }

    persistCache(): void
    {
        this.cache.persistCache();
    }

    private async fetchPositionAnalyze(input: AnalysisInput): Promise<AnalysisOutput>
    {
        const result = await apiPostHexplorerAnalyzePosition(input);

        result.recommendedMove = bestMoveFromPolicy(result.policy, [...input.black, ...input.white]);

        return result;
    }
}
