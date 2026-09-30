import assert from 'assert';
import { describe, it } from 'mocha';
import { consolidateGameAnalyze, hasSwapMove, splitToAnalyzeMoveInputs } from '../../ai-jobs/gameAnalyze.js';
import type { AnalyzeMoveOutput } from '../../ai-jobs/protocol.js';

const moveAnalyze = (moveIndex: number, move: string, whiteWin: number, bestMoves: AnalyzeMoveOutput['bestMoves'] = []): AnalyzeMoveOutput => ({
    moveIndex,
    color: moveIndex % 2 === 0 ? 'black' : 'white',
    whiteWin,
    move: { move, value: 0.5 },
    bestMoves,
});

describe('gameAnalyze', () => {
    describe('splitToAnalyzeMoveInputs', () => {
        it('creates one task per move, with history before the move', () => {
            const inputs = splitToAnalyzeMoveInputs({ size: 11, movesHistory: 'a1 b2 c3' });

            assert.deepStrictEqual(inputs.map(input => [input.moveIndex, input.move, input.color, input.movesHistory, input.isLastMoveOfGame]), [
                [0, 'a1', 'black', '', false],
                [1, 'b2', 'white', 'a1', false],
                [2, 'c3', 'black', 'a1 b2', true],
            ]);
        });

        it('does not analyze swap move', () => {
            const inputs = splitToAnalyzeMoveInputs({ size: 11, movesHistory: 'a2 swap-pieces c3' });

            assert.deepStrictEqual(inputs.map(input => input.moveIndex), [0, 2]);
            assert.strictEqual(inputs[1].movesHistory, 'a2 swap-pieces');
            assert.strictEqual(hasSwapMove({ size: 11, movesHistory: 'a2 swap-pieces c3' }), true);
            assert.strictEqual(hasSwapMove({ size: 11, movesHistory: 'a2 b3 c3' }), false);
        });
    });

    describe('consolidateGameAnalyze', () => {
        it('sets move win rate from next position win rate, also in best moves', () => {
            const data = consolidateGameAnalyze([
                moveAnalyze(0, 'a1', 0.4, [{ move: 'f6', value: 0.9 }, { move: 'a1', value: 0.1 }]),
                moveAnalyze(1, 'b2', 0.7),
            ], false);

            assert.strictEqual(data[0]?.move.whiteWin, 0.7);
            assert.strictEqual(data[0]?.bestMoves[1].whiteWin, 0.7);
            assert.strictEqual(data[0]?.bestMoves[0].whiteWin, undefined);
        });

        it('keeps missing moves as null, without failing', () => {
            const results = [moveAnalyze(0, 'a1', 0.4), null, moveAnalyze(2, 'c3', 0.5), null];
            const data = consolidateGameAnalyze(results, false);

            assert.strictEqual(data.length, 4);
            assert.strictEqual(data[1], null);
            assert.strictEqual(data[3], null);
            assert.strictEqual(data[0]?.move.whiteWin, undefined);
        });

        it('deduces swap move analyze from third move, mirrored', () => {
            const data = consolidateGameAnalyze([
                moveAnalyze(0, 'a2', 0.5),
                null,
                moveAnalyze(2, 'c3', 0.3, [{ move: 'd4', value: 0.8, whiteWin: 0.2 }, { move: 'a3', value: 0.1, whiteWin: 0.4 }]),
            ], true);

            assert.strictEqual(data[1]?.move.move, 'swap-pieces');
            assert.strictEqual(data[1]?.whiteWin, 0.7);
            assert.deepStrictEqual(data[1]?.bestMoves.map(m => [m.move, m.whiteWin]), [
                ['d4', 0.8],
                ['c1', 0.6],
                ['swap-pieces', 0.3],
            ]);

            // First move gets win rate from deduced swap move
            assert.strictEqual(data[0]?.move.whiteWin, 0.7);
        });

        it('does not mutate results', () => {
            const results = [moveAnalyze(0, 'a1', 0.4), moveAnalyze(1, 'b2', 0.7)];
            consolidateGameAnalyze(results, false);

            assert.strictEqual(results[0].move.whiteWin, undefined);
        });
    });
});
