import assert from 'assert';
import { describe, it } from 'mocha';
import { getAiJobTypeEngine, getEngineAiJobTypes, getEngineDefaultAiJobTypes } from '../../ai-jobs/protocol.js';

describe('protocol', () => {
    it('gives engine of a job type', () => {
        assert.strictEqual(getAiJobTypeEngine('katahex-mcts-analyze-move'), 'katahex');
        assert.strictEqual(getAiJobTypeEngine('mohex'), 'mohex');
    });

    it('does not process opt-in job types by default', () => {
        assert.deepStrictEqual(getEngineDefaultAiJobTypes('katahex'), [
            'katahex-intuition-move',
            'katahex-intuition-analyze-position',
            'katahex-intuition-analyze-game',
        ]);

        assert.ok(getEngineAiJobTypes('katahex').includes('katahex-mcts-move'));
        assert.deepStrictEqual(getEngineDefaultAiJobTypes('mohex'), ['mohex']);
    });
});
