import { createClient } from 'redis';
import logger from '../services/logger.js';

const CACHE_TTL_SECONDS = 30 * 24 * 3600;

/**
 * Max entries kept in memory when redis is not available.
 */
const MEMORY_CACHE_MAX_SIZE = 20_000;

type RedisClient = ReturnType<typeof createClient>;

/**
 * Shared by all caches. Created on first use, to not connect to redis when not used, i.e in commands.
 */
let redisClient: undefined | null | RedisClient = undefined;

const getRedisClient = (): null | RedisClient => {
    if (redisClient === undefined) {
        const { REDIS_URL } = process.env;

        redisClient = REDIS_URL ? createClient({ url: REDIS_URL }) : null;

        redisClient?.connect().catch(e => {
            logger.error('AI job cache: could not connect to redis', { message: e?.message });
        });
    }

    return redisClient;
};

/**
 * Caches AI job results as json, in redis if available, else in memory.
 * Also prevents running a same job twice at same time, see dedupe().
 */
export default class RedisOrMemoryCache<T>
{
    /**
     * Used when redis not available. Map keeps insertion order, oldest are removed first.
     */
    private memoryCache = new Map<string, T>();

    /**
     * Jobs being processed, by key.
     */
    private pending = new Map<string, Promise<unknown>>();

    /**
     * @param name Part of redis keys, e.g "hexplorer-analysis"
     */
    constructor(
        private name: string,
    ) {}

    private getRedisKey(key: string): string
    {
        return (process.env.REDIS_PREFIX ?? 'hex') + '-' + this.name + ':' + key;
    }

    async get(key: string): Promise<null | T>
    {
        const redisClient = getRedisClient();

        if (redisClient) {
            const cached = await redisClient.get(this.getRedisKey(key));

            return cached === null ? null : JSON.parse(cached) as T;
        }

        return this.memoryCache.get(key) ?? null;
    }

    /**
     * @throws On redis error
     */
    async set(key: string, value: T): Promise<void>
    {
        const redisClient = getRedisClient();

        if (redisClient) {
            await redisClient.set(this.getRedisKey(key), JSON.stringify(value), { EX: CACHE_TTL_SECONDS });
            return;
        }

        this.memoryCache.delete(key);
        this.memoryCache.set(key, value);

        if (this.memoryCache.size > MEMORY_CACHE_MAX_SIZE) {
            this.memoryCache.delete(this.memoryCache.keys().next().value!);
        }
    }

    /**
     * Same as set(), but only logs errors, so a cache failure does not fail the job.
     */
    async trySet(key: string, value: T): Promise<void>
    {
        try {
            await this.set(key, value);
        } catch (e) {
            logger.error(`Cache ${this.name}: could not store value`, { message: (e as Error)?.message });
        }
    }

    /**
     * Runs job, or returns the same job already running with this key.
     */
    async dedupe<R>(key: string, job: () => Promise<R>): Promise<R>
    {
        let running = this.pending.get(key) as undefined | Promise<R>;

        if (running !== undefined) {
            return running;
        }

        running = job();
        this.pending.set(key, running);

        try {
            return await running;
        } finally {
            this.pending.delete(key);
        }
    }
}
