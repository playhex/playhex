import assert from 'assert';
import { describe, it } from 'mocha';
import { InvalidAiResultError, validateAiResult } from '../../ai-jobs/worker/validateAiResult.js';
import { splitToAnalyzeMoveInputs } from '../../ai-jobs/gameAnalyze.js';
import type { AiTask, AnalyzeGameInput, AnalyzeMoveOutput, SolvePositionInput } from '../../ai-jobs/protocol.js';

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

    describe('mohex-solve-position', () => {
        const solveInput: SolvePositionInput = { size: 2, black: ['a1'], white: ['b1'], color: 'black', timeLimitSeconds: 5 };
        const solveTask: AiTask = { type: 'mohex-solve-position', data: solveInput };
        const childrenTask: AiTask = { type: 'mohex-solve-position', data: { ...solveInput, children: { maxTimeSeconds: 60 } } };

        it('accepts proven and not proven results', () => {
            assert.doesNotThrow(() => validateAiResult(solveTask, { winner: 'black', pv: ['a2', 'b2'] }));
            assert.doesNotThrow(() => validateAiResult(solveTask, { winner: null, pv: [] }));
        });

        it('refuses invalid winner or pv', () => {
            assert.throws(() => validateAiResult(solveTask, { winner: 'red', pv: [] }), InvalidAiResultError);
            assert.throws(() => validateAiResult(solveTask, { winner: 'black', pv: ['c3'] }), InvalidAiResultError);
            assert.throws(() => validateAiResult(solveTask, { winner: 'black', pv: ['swap-pieces'] }), InvalidAiResultError);
            assert.throws(() => validateAiResult(solveTask, { winner: 'black' }), InvalidAiResultError);
        });

        it('refuses children when not requested', () => {
            assert.throws(() => validateAiResult(solveTask, { winner: 'black', pv: [], children: {} }), InvalidAiResultError);
        });

        it('requires a result for each empty cell when children requested', () => {
            const child = { winner: 'black', pv: [] };

            assert.doesNotThrow(() => validateAiResult(childrenTask, { winner: 'black', pv: [], children: { a2: child, b2: { winner: null, pv: [] } } }));
            assert.throws(() => validateAiResult(childrenTask, { winner: 'black', pv: [], children: { a2: child } }), InvalidAiResultError);
            assert.throws(() => validateAiResult(childrenTask, { winner: 'black', pv: [], children: { a2: child, a1: child } }), InvalidAiResultError);
            assert.throws(() => validateAiResult(childrenTask, { winner: 'black', pv: [] }), InvalidAiResultError);
        });
    });
});
