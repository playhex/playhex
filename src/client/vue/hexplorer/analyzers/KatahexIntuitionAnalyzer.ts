import { HexMove } from '../../../../shared/move-notation/hex-move-notation.js';
import { coordsToMove } from '../../../../shared/move-notation/move-notation.js';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../../../shared/app/hexplorer.js';
import { LocalStorageCache } from '../services/cachedAnalysis.js';
import { AnalyzerInterface } from './AnalyzerInterface.js';
import { apiPostHexplorerAnalyzePosition } from '../../../apiClient.js';

export class KatahexIntuitionAnalyzer implements AnalyzerInterface
{
    private cache = new LocalStorageCache<AnalysisOutput>('analysisCache');

    async analyzePosition(input: AnalysisInput): Promise<AnalysisOutput>
    {
        const cacheKey = analysisCacheKey(input);
        return await this.cache.getItem(cacheKey, () => this.fetchPositionAnalyze(input));
    }

    /**
     * The empty cell with the highest policy, or null if there is no policy.
     */
    private recommendedMoveFromPolicy(policy: undefined | number[][], black: string[], white: string[]): null | HexMove
    {
        if (!policy) {
            return null;
        }

        const occupied = new Set<string>([...black, ...white]);

        let bestMove: null | HexMove = null;
        let bestPolicy = -Infinity;

        for (let row = 0; row < policy.length; ++row) {
            for (let col = 0; col < policy[row].length; ++col) {
                const move = coordsToMove({ row, col });

                if (occupied.has(move)) {
                    continue;
                }

                if (policy[row][col] > bestPolicy) {
                    bestPolicy = policy[row][col];
                    bestMove = move;
                }
            }
        }

        return bestMove;
    }

    getName(): string
    {
        return 'Katahex Intuition';
    }

    persistCache(): void
    {
        this.cache.persistCache();
    }

    private async fetchPositionAnalyze(input: AnalysisInput): Promise<AnalysisOutput>
    {
        const result = await apiPostHexplorerAnalyzePosition(input);

        result.recommendedMove = this.recommendedMoveFromPolicy(result.policy, input.black, input.white);

        return result;
    }
}
