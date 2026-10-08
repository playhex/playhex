import { Service } from 'typedi';
import { createClient } from 'redis';
import { analysisCacheKey, type AnalysisInput, type AnalysisOutput } from '../../shared/app/hexplorer.js';
import AiJobService from './AiJobService.js';
import logger from '../services/logger.js';

const CACHE_TTL_SECONDS = 30 * 24 * 3600;

/**
 * Max positions kept in memory when redis is not available.
 */
const MEMORY_CACHE_MAX_SIZE = 20_000;

type RedisClient = ReturnType<typeof createClient>;

/**
 * Analyzes positions with katahex, through AI jobs, and caches results by position and engine.
 * Shared by Hexplorer and puzzles katahex check.
 *
 * Cached in redis if available, else in memory.
 */
@Service()
export default class PositionAnalysisCache
{
    /**
     * Created on first use, to not connect to redis when not used, i.e in commands.
     */
    private redisClient: undefined | null | RedisClient = undefined;

    /**
     * Used when redis not available. Map keeps insertion order, oldest are removed first.
     */
    private memoryCache = new Map<string, AnalysisOutput>();

    /**
     * Analyzes being processed, to not analyze a same position twice at same time.
     */
    private pending = new Map<string, Promise<AnalysisOutput>>();

    constructor(
        private aiJobService: AiJobService,
    ) {}

    private getRedisClient(): null | RedisClient
    {
        if (this.redisClient === undefined) {
            const { REDIS_URL } = process.env;

            this.redisClient = REDIS_URL ? createClient({ url: REDIS_URL }) : null;

            if (this.redisClient) {
                this.redisClient.connect().catch(e => {
                    logger.error('Position analysis cache: could not connect to redis', { message: e?.message });
                });
            }
        }

        return this.redisClient;
    }

    private getKey(input: AnalysisInput): string
    {
        // Same prefix as before, to keep existing Hexplorer cache
        return (process.env.REDIS_PREFIX ?? 'hex') + '-hexplorer-analysis:' + analysisCacheKey(input);
    }

    /**
     * @returns Cached analyze, or null if position has not been analyzed with this engine.
     */
    async get(input: AnalysisInput): Promise<null | AnalysisOutput>
    {
        const key = this.getKey(input);
        const redisClient = this.getRedisClient();

        if (redisClient) {
            const cached = await redisClient.get(key);

            return cached === null ? null : JSON.parse(cached) as AnalysisOutput;
        }

        return this.memoryCache.get(key) ?? null;
    }

    private set(input: AnalysisInput, output: AnalysisOutput): void
    {
        const key = this.getKey(input);
        const redisClient = this.getRedisClient();

        if (redisClient) {
            redisClient.set(key, JSON.stringify(output), { EX: CACHE_TTL_SECONDS }).catch(e => {
                logger.error('Position analysis cache: could not store analyze', { message: e?.message });
            });

            return;
        }

        this.memoryCache.delete(key);
        this.memoryCache.set(key, output);

        if (this.memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
            this.memoryCache.delete(this.memoryCache.keys().next().value!);
        }
    }

    /**
     * Cached analyze, else analyzes position with an AI worker.
     * Caller should check engine is available, see AiJobService.isAnalysisEngineAvailable().
     *
     * @throws {AiJobError}
     */
    async analyze(input: AnalysisInput): Promise<AnalysisOutput>
    {
        const key = this.getKey(input);
        let analysis = this.pending.get(key);

        if (analysis !== undefined) {
            return analysis;
        }

        analysis = (async () => {
            const cached = await this.get(input);

            if (cached !== null) {
                return cached;
            }

            const output: AnalysisOutput = await this.aiJobService.analyzePosition({
                size: input.size,
                color: input.color,
                black: input.black.join(' '),
                white: input.white.join(' '),
            }, input.engine === 'katahex-mcts');

            this.set(input, output);

            return output;
        })();

        this.pending.set(key, analysis);

        try {
            return await analysis;
        } finally {
            this.pending.delete(key);
        }
    }
}
