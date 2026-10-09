import assert from 'assert';
import { after, before, describe, it } from 'mocha';
import PositionSolveCache from '../../ai-jobs/PositionSolveCache.js';
import type AiJobService from '../../ai-jobs/AiJobService.js';
import type { SolvePositionInput, SolvePositionOutput } from '../../ai-jobs/protocol.js';

const createCache = (outputs: SolvePositionOutput[]) => {
    const calls: SolvePositionInput[] = [];

    const aiJobService = {
        solvePosition: async (input: SolvePositionInput) => {
            calls.push(input);
            await new Promise(resolve => setTimeout(resolve, 5));

            return outputs[Math.min(calls.length, outputs.length) - 1];
        },
    } as unknown as AiJobService;

    return { cache: new PositionSolveCache(aiJobService), calls };
};

const input: SolvePositionInput = { size: 5, color: 'black', black: ['b2', 'a1'], white: ['c3'], timeLimitSeconds: 5 };

describe('PositionSolveCache', () => {
    let redisUrl: undefined | string;

    // Memory cache only
    before(() => {
        redisUrl = process.env.REDIS_URL;
        process.env.REDIS_URL = '';
    });

    after(() => {
        process.env.REDIS_URL = redisUrl;
    });

    it('solves a same position only once, even at same time', async () => {
        const { cache, calls } = createCache([{ winner: 'black', pv: [] }]);

        await Promise.all([
            cache.solve(input),
            cache.solve({ ...input, black: ['a1', 'b2'] }),
        ]);

        assert.strictEqual(calls.length, 1);

        // Proven: reused even with higher limits
        await cache.solve({ ...input, timeLimitSeconds: 60 });
        assert.strictEqual(calls.length, 1);
    });

    it('reuses not proven result only with same or lower limits', async () => {
        const { cache, calls } = createCache([{ winner: null, pv: [] }, { winner: 'white', pv: ['d4'] }]);

        assert.strictEqual((await cache.solve(input)).winner, null);
        assert.strictEqual((await cache.solve({ ...input, timeLimitSeconds: 2 })).winner, null);
        assert.strictEqual(calls.length, 1);

        assert.strictEqual((await cache.solve({ ...input, timeLimitSeconds: 20 })).winner, 'white');
        assert.strictEqual(calls.length, 2);

        // Proven result replaced not proven one
        assert.strictEqual((await cache.solve(input)).winner, 'white');
        assert.strictEqual(calls.length, 2);
    });

    it('solves again children not proven with a higher total time', async () => {
        const partial: SolvePositionOutput = { winner: 'black', pv: [], children: { d4: { winner: null, pv: [] } } };
        const { cache, calls } = createCache([partial]);
        const childrenInput: SolvePositionInput = { ...input, children: { maxTimeSeconds: 60 } };

        await cache.solve(childrenInput);
        await cache.solve(childrenInput);
        assert.strictEqual(calls.length, 1);

        await cache.solve({ ...childrenInput, children: { maxTimeSeconds: 120 } });
        assert.strictEqual(calls.length, 2);

        // Position only and with children are cached separately
        await cache.solve(input);
        assert.strictEqual(calls.length, 3);
    });

    it('does not replace a solve proving more by one ending later', async () => {
        const calls: SolvePositionInput[] = [];

        // Higher limit proves, and ends first
        const aiJobService = {
            solvePosition: async (input: SolvePositionInput): Promise<SolvePositionOutput> => {
                calls.push(input);
                const proves = input.timeLimitSeconds > 5;
                await new Promise(resolve => setTimeout(resolve, proves ? 5 : 20));

                return { winner: proves ? 'black' : null, pv: [] };
            },
        } as unknown as AiJobService;

        const cache = new PositionSolveCache(aiJobService);

        await Promise.all([
            cache.solve(input),
            cache.solve({ ...input, timeLimitSeconds: 60 }),
        ]);

        assert.strictEqual(calls.length, 2);
        assert.strictEqual((await cache.solve(input)).winner, 'black');
        assert.strictEqual(calls.length, 2);
    });
});
