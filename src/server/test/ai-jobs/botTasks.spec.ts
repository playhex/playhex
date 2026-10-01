import assert from 'assert';
import { describe, it } from 'mocha';
import { createBotMoveTask, getBotJobType } from '../../ai-jobs/botTasks.js';

const game = { size: 11, movesHistory: '', currentPlayer: 'black' as const, swapRule: true };

describe('botTasks', () => {
    it('gives job type of a bot from its config', () => {
        assert.strictEqual(getBotJobType('katahex', { maxPlayouts: 0 }), 'katahex-intuition-move');
        assert.strictEqual(getBotJobType('katahex', { maxPlayouts: 400 }), 'katahex-mcts-move');
        assert.strictEqual(getBotJobType('mohex', { maxGames: 100 }), 'mohex');
        assert.strictEqual(getBotJobType('davies', { level: 1 }), 'davies');
        assert.strictEqual(getBotJobType('random', { determinist: true }), null);
    });

    it('creates move task with engine parameters', () => {
        assert.deepStrictEqual(createBotMoveTask('mohex', { maxGames: 100 }, game), { type: 'mohex', data: { game, maxGames: 100 } });
        assert.deepStrictEqual(createBotMoveTask('katahex', { maxPlayouts: 0 }, game), { type: 'katahex-intuition-move', data: { game } });
        assert.deepStrictEqual(createBotMoveTask('katahex', { maxPlayouts: 1000 }, game), { type: 'katahex-mcts-move', data: { game, maxPlayouts: 1000 } });
        assert.throws(() => createBotMoveTask('katahex', { maxPlayouts: 400.5 }, game));
        assert.strictEqual(createBotMoveTask('random', {}, game), null);
        assert.throws(() => createBotMoveTask('davies', {}, game));
        assert.throws(() => createBotMoveTask('davies', { level: 11 }, game));
    });
});
