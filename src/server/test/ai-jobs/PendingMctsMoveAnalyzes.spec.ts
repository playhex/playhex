import assert from 'assert';
import { describe, it } from 'mocha';
import PendingMctsMoveAnalyzes from '../../ai-jobs/PendingMctsMoveAnalyzes.js';

describe('PendingMctsMoveAnalyzes', () => {
    it('reserves only moves not already being processed, for overlapping ranges', () => {
        const pending = new PendingMctsMoveAnalyzes();

        assert.deepStrictEqual(pending.reserve('game', 'abc', [2, 3, 4]), [2, 3, 4]);
        assert.deepStrictEqual(pending.reserve('game', 'abc', [3, 4, 5, 6]), [5, 6]);
        assert.ok(pending.isPending('game', 'abc', 4));
        assert.ok(!pending.isPending('game', 'abc', 1));
    });

    it('scopes moves by game type and game', () => {
        const pending = new PendingMctsMoveAnalyzes();

        pending.reserve('game', 'abc', [2]);

        assert.deepStrictEqual(pending.reserve('external', 'abc', [2]), [2]);
        assert.deepStrictEqual(pending.reserve('game', 'def', [2]), [2]);
    });

    it('can reserve released moves again', () => {
        const pending = new PendingMctsMoveAnalyzes();

        pending.reserve('game', 'abc', [2, 3, 4]);
        pending.release('game', 'abc', 3);
        pending.release('game', 'abc', [2]);

        assert.deepStrictEqual(pending.reserve('game', 'abc', [2, 3, 4]), [2, 3]);
    });
});
