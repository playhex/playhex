import assert from 'assert';
import { describe, it } from 'mocha';
import { InvalidAiResultError, validateAiResult } from '../../ai-jobs/worker/validateAiResult.js';
import { splitToAnalyzeMoveInputs } from '../../ai-jobs/gameAnalyze.js';
import type { AiTask, AnalyzeGameInput, AnalyzeMoveOutput } from '../../ai-jobs/protocol.js';

const input: AnalyzeGameInput = { size: 11, movesHistory: 'a2 swap-pieces c3' };
const task: AiTask = { type: 'katahex-intuition-analyze-game', data: input };

const validResult = (): AnalyzeMoveOutput[] => splitToAnalyzeMoveInputs(input).map(moveInput => ({
    moveIndex: moveInput.moveIndex,
    color: moveInput.color,
    whiteWin: 0.5,
    move: { move: moveInput.move, value: 0.5 },
    bestMoves: [{ move: 'f6', value: 0.3, whiteWin: 0.6 }],
}));

describe('validateAiResult', () => {
    describe('katahex-intuition-analyze-game', () => {
        it('accepts one analyze per move, swap move excluded', () => {
            const result = validResult();

            assert.strictEqual(result.length, 2);
            assert.deepStrictEqual(validateAiResult(task, result), result);
        });

        it('refuses missing moves', () => {
            assert.throws(() => validateAiResult(task, validResult().slice(1)), InvalidAiResultError);
            assert.throws(() => validateAiResult(task, {}), InvalidAiResultError);
        });

        it('refuses moves in wrong order, or invalid move analyze', () => {
            assert.throws(() => validateAiResult(task, validResult().reverse()), InvalidAiResultError);

            const result = validResult();
            result[1].whiteWin = 2;

            assert.throws(() => validateAiResult(task, result), InvalidAiResultError);
        });
    });
});
