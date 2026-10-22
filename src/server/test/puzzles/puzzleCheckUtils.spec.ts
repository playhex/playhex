import assert from 'assert';
import { describe, it } from 'mocha';
import { createJobRunner, createLimiter, getPuzzleRunKey } from '../../puzzles/puzzleCheckUtils.js';
import type { PuzzleDefinition } from '../../../shared/app/puzzles/puzzleTree.js';

const puzzle: PuzzleDefinition = {
    boardsize: 4,
    redStones: ['b2', 'a1'],
    blueStones: ['c3'],
    disabledCells: ['d4'],
    playerColor: 0,
    tree: { children: [{ move: 'b3', message: 'Good' }] },
};

describe('puzzleCheckUtils', () => {
    describe('getPuzzleRunKey', () => {
        it('ignores stones order and messages', () => {
            const same: PuzzleDefinition = { ...puzzle, redStones: ['a1', 'b2'], tree: { children: [{ move: 'b3', message: 'Other' }] } };

            assert.strictEqual(getPuzzleRunKey(same, { a: 1 }), getPuzzleRunKey(puzzle, { a: 1 }));
        });

        it('changes with fixed fill, tree and options', () => {
            const key = getPuzzleRunKey(puzzle, { a: 1 });

            assert.notStrictEqual(getPuzzleRunKey({ ...puzzle, fixedFill: [{ move: 'd4', color: 0 }] }, { a: 1 }), key);
            assert.notStrictEqual(getPuzzleRunKey({ ...puzzle, tree: {} }, { a: 1 }), key);
            assert.notStrictEqual(getPuzzleRunKey(puzzle, { a: 2 }), key);
        });
    });

    describe('createJobRunner', () => {
        const createRunner = (maxJobs: number) => {
            const inputs: number[] = [];
            const progress: [number, number][] = [];
            const runner = createJobRunner({
                run: (input: number) => {
                    inputs.push(input);
                    return Promise.resolve(input * 2);
                },
                maxJobs,
                limit: createLimiter(2),
                onProgress: (done, total) => progress.push([done, total]),
            });

            return { runner, inputs, progress };
        };

        it('runs each key once', async () => {
            const { runner, inputs } = createRunner(10);

            assert.deepStrictEqual(await Promise.all([runner.run('a', 1), runner.run('a', 1), runner.run('b', 2)]), [2, 2, 4]);
            assert.deepStrictEqual(inputs, [1, 2]);
        });

        it('returns null once budget is exceeded', async () => {
            const { runner } = createRunner(1);

            assert.strictEqual(await runner.run('a', 1), 2);
            assert.strictEqual(runner.isBudgetExceeded(), false);
            assert.strictEqual(runner.run('b', 2), null);
            assert.strictEqual(runner.isBudgetExceeded(), true);

            // Already run jobs are still returned
            assert.strictEqual(await runner.run('a', 1), 2);
        });

        it('counts planned jobs in progress total', async () => {
            const { runner, progress } = createRunner(10);

            runner.plan('a');
            runner.plan('b');
            runner.reportProgress();
            await runner.run('a', 1);

            assert.deepStrictEqual(progress, [[0, 2], [0, 2], [1, 2]]);
        });
    });
});
