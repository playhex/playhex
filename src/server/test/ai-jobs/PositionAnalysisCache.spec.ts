import assert from 'assert';
import { after, before, describe, it } from 'mocha';
import PositionAnalysisCache from '../../ai-jobs/PositionAnalysisCache.js';
import type AiJobService from '../../ai-jobs/AiJobService.js';
import type { AnalysisInput } from '../../../shared/app/hexplorer.js';

const createCache = () => {
    const calls: unknown[] = [];

    const aiJobService = {
        analyzePosition: async (input: unknown, mcts: boolean) => {
            calls.push({ input, mcts });
            await new Promise(resolve => setTimeout(resolve, 5));

            return { whiteWin: 0.4, policy: [[1]] };
        },
    } as unknown as AiJobService;

    return { cache: new PositionAnalysisCache(aiJobService), calls };
};

const input: AnalysisInput = { size: 5, color: 'black', black: ['b2', 'a1'], white: ['c3'] };

describe('PositionAnalysisCache', () => {
    let redisUrl: undefined | string;

    // Memory cache only
    before(() => {
        redisUrl = process.env.REDIS_URL;
        process.env.REDIS_URL = '';
    });

    after(() => {
        process.env.REDIS_URL = redisUrl;
    });

    it('analyzes a same position only once, even at same time', async () => {
        const { cache, calls } = createCache();

        const results = await Promise.all([
            cache.analyze(input),
            cache.analyze({ ...input, black: ['a1', 'b2'] }),
        ]);

        assert.deepStrictEqual(results[0], results[1]);
        assert.strictEqual(calls.length, 1);

        await cache.analyze(input);
        assert.strictEqual(calls.length, 1);
        assert.deepStrictEqual(await cache.get(input), { whiteWin: 0.4, policy: [[1]] });
    });

    it('caches by engine', async () => {
        const { cache, calls } = createCache();

        await cache.analyze(input);
        assert.strictEqual(await cache.get({ ...input, engine: 'katahex-mcts' }), null);

        await cache.analyze({ ...input, engine: 'katahex-mcts' });
        assert.deepStrictEqual(calls.map(call => (call as { mcts: boolean }).mcts), [false, true]);
    });
});
