import { Service } from 'typedi';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import AiJobService from './AiJobService.js';
import RedisOrMemoryCache from './RedisOrMemoryCache.js';

/**
 * Analyzes positions with katahex, through AI jobs, and caches results by position and engine.
 * Shared by Hexplorer and puzzles katahex check.
 *
 * Cached in redis if available, else in memory.
 */
@Service()
export default class PositionAnalysisCache
{
    // Same name as before, to keep existing Hexplorer cache
    private cache = new RedisOrMemoryCache<AnalysisOutput>('hexplorer-analysis');

    constructor(
        private aiJobService: AiJobService,
    ) {}

    /**
     * @returns Cached analyze, or null if position has not been analyzed with this engine.
     */
    async get(input: AnalysisInput): Promise<null | AnalysisOutput>
    {
        return await this.cache.get(analysisCacheKey(input));
    }

    /**
     * Cached analyze, else analyzes position with an AI worker.
     * Caller should check engine is available, see AiJobService.isAnalysisEngineAvailable().
     *
     * @throws {AiJobError}
     */
    async analyze(input: AnalysisInput): Promise<AnalysisOutput>
    {
        const key = analysisCacheKey(input);

        return await this.cache.dedupe(key, async () => {
            const cached = await this.cache.get(key);

            if (cached !== null) {
                return cached;
            }

            const output: AnalysisOutput = await this.aiJobService.analyzePosition({
                size: input.size,
                color: input.color,
                black: input.black.join(' '),
                white: input.white.join(' '),
            }, input.engine === 'katahex-mcts');

            await this.cache.trySet(key, output);

            return output;
        });
    }
}
