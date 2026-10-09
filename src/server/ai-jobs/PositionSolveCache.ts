import { Service } from 'typedi';
import AiJobService from './AiJobService.js';
import RedisOrMemoryCache from './RedisOrMemoryCache.js';
import type { SolvePositionInput, SolvePositionOutput } from './protocol.js';

/**
 * Solve output, with limits it has been computed with.
 */
export type CachedSolve = {
    output: SolvePositionOutput;
    timeLimitSeconds: number;
    maxTimeSeconds?: number;
};

const isFullyProven = (output: SolvePositionOutput): boolean =>
    output.winner !== null
    && Object.values(output.children ?? {}).every(child => child.winner !== null)
;

/**
 * Whether a cached solve answers this request:
 * fully proven, or not proven but with limits at least as high as requested,
 * else solving again with higher limits may prove more.
 */
export const isCachedSolveReusable = (cached: CachedSolve, input: SolvePositionInput): boolean => {
    if (isFullyProven(cached.output)) {
        return true;
    }

    if (cached.timeLimitSeconds < input.timeLimitSeconds) {
        return false;
    }

    return input.children === undefined || (cached.maxTimeSeconds ?? 0) >= input.children.maxTimeSeconds;
};

/**
 * Whether a new solve should replace a cached one of same position:
 * it proves everything, or cached one is not proven and has not higher limits.
 */
const isBetterSolve = (solve: CachedSolve, cached: CachedSolve): boolean => {
    if (isFullyProven(solve.output)) {
        return true;
    }

    if (isFullyProven(cached.output)) {
        return false;
    }

    return solve.timeLimitSeconds >= cached.timeLimitSeconds
        && (solve.maxTimeSeconds ?? 0) >= (cached.maxTimeSeconds ?? 0)
    ;
};

export const solveCacheKey = ({ size, color, black, white, children }: SolvePositionInput): string =>
    [size, color, [...black].sort().join(','), [...white].sort().join(','), children ? 'c' : 'p'].join('|')
;

/**
 * Solves positions with Mohex solver, through AI jobs, and caches results by position.
 * Not proven results are cached too, with their time limits.
 *
 * Cached in redis if available, else in memory.
 */
@Service()
export default class PositionSolveCache
{
    private cache = new RedisOrMemoryCache<CachedSolve>('position-solve');

    constructor(
        private aiJobService: AiJobService,
    ) {}

    /**
     * Whether solve() would return a cached result, without solving.
     */
    async isCached(input: SolvePositionInput): Promise<boolean>
    {
        const cached = await this.cache.get(solveCacheKey(input));

        return cached !== null && isCachedSolveReusable(cached, input);
    }

    /**
     * Cached solve if reusable, see isCachedSolveReusable(), else solves position with an AI worker.
     * Caller should check solver is available, see AiJobService.isSolverAvailable().
     *
     * @param timeoutMs See AiJobService.solvePosition()
     *
     * @throws {AiJobError}
     */
    async solve(input: SolvePositionInput, timeoutMs?: number): Promise<SolvePositionOutput>
    {
        const key = solveCacheKey(input);

        // Limits in pending key: a request with higher limits must not wait a solve with lower ones
        const pendingKey = key + '|' + input.timeLimitSeconds + '|' + (input.children?.maxTimeSeconds ?? '');

        return await this.cache.dedupe(pendingKey, async () => {
            const cached = await this.cache.get(key);

            if (cached !== null && isCachedSolveReusable(cached, input)) {
                return cached.output;
            }

            const solve: CachedSolve = {
                output: await this.aiJobService.solvePosition(input, timeoutMs),
                timeLimitSeconds: input.timeLimitSeconds,
                ...(input.children ? { maxTimeSeconds: input.children.maxTimeSeconds } : {}),
            };

            // Read again: a solve with higher limits may have ended meanwhile, not replaced if it proves more
            const latest = await this.cache.get(key);

            if (latest === null || isBetterSolve(solve, latest)) {
                await this.cache.trySet(key, solve);
            }

            return solve.output;
        });
    }
}
