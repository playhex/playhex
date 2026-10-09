import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove } from '@playhex/move-notation';
import { swapMaps } from '../swap-maps.js';
import { getFirstMoveCandidates, getFirstMoveWinRate, MIN_FIRST_MOVE_CANDIDATES, pickFairFirstMove, shouldSwap, swapProbability, SWAP_ALWAYS_ABOVE, SWAP_NEVER_BELOW } from '../swapDecision.js';

/**
 * Returns a rng returning given values in a loop.
 */
const fixedRng = (...values: number[]) => {
    let i = 0;

    return () => values[i++ % values.length];
};

describe('swapDecision', () => {
    describe('swapProbability', () => {
        it('never swaps weak moves, always swaps strong moves', () => {
            assert.strictEqual(swapProbability(0), 0);
            assert.strictEqual(swapProbability(0.14), 0);
            assert.strictEqual(swapProbability(0.86), 1);
            assert.strictEqual(swapProbability(1), 1);
        });

        it('follows a sigmoid between thresholds', () => {
            assert.strictEqual(swapProbability(0.5), 0.5);
            assert.ok(swapProbability(0.6) > 0.6 && swapProbability(0.6) < 0.7);
            assert.ok(swapProbability(0.4) > 0.3 && swapProbability(0.4) < 0.4);

            for (let w = 0; w < 1; w += 0.01) {
                assert.ok(swapProbability(w) <= swapProbability(w + 0.01));
            }
        });
    });

    describe('getFirstMoveWinRate', () => {
        it('reads swap map with row as number and col as letter', () => {
            assert.strictEqual(getFirstMoveWinRate(11, 'a1'), swapMaps[11][0][0]);
            assert.strictEqual(getFirstMoveWinRate(11, 'k1'), 0.888);
            assert.strictEqual(getFirstMoveWinRate(11, 'a2'), 0.166);
        });

        it('returns null when cannot be determined', () => {
            assert.strictEqual(getFirstMoveWinRate(28, 'a1'), null);
            assert.strictEqual(getFirstMoveWinRate(11, 'pass'), null);
            assert.strictEqual(getFirstMoveWinRate(11, 'z1'), null);
        });
    });

    describe('shouldSwap', () => {
        it('swaps depending on first move strength', () => {
            assert.strictEqual(shouldSwap(11, 'a1', fixedRng(0)), false);
            assert.strictEqual(shouldSwap(11, 'f6', fixedRng(0.999)), true);
        });

        it('swaps randomly fair moves', () => {
            const size = 19;
            const row = swapMaps[size].findIndex(line => line.some(w => w > 0.45 && w < 0.55));
            const col = swapMaps[size][row].findIndex(w => w > 0.45 && w < 0.55);
            const fairMove = coordsToMove({ row, col });

            assert.strictEqual(shouldSwap(size, fairMove, fixedRng(0.01)), true);
            assert.strictEqual(shouldSwap(size, fairMove, fixedRng(0.99)), false);
        });

        it('returns null when no swap map', () => {
            assert.strictEqual(shouldSwap(28, 'a1'), null);
        });
    });

    describe('pickFairFirstMove', () => {
        it('picks moves in fair range', () => {
            for (const size of [14, 19, 27]) {
                for (let i = 0; i < 200; ++i) {
                    const move = pickFairFirstMove(size);

                    assert.ok(move !== null);

                    const winRate = getFirstMoveWinRate(size, move)!;

                    assert.ok(winRate >= SWAP_NEVER_BELOW && winRate <= SWAP_ALWAYS_ABOVE, `${size}: ${move} = ${winRate}`);
                }
            }
        });

        it('picks moves closer to 0.5 more often than uniformly', () => {
            const size = 19;
            const fairWinRates = swapMaps[size].flat().filter(w => w >= SWAP_NEVER_BELOW && w <= SWAP_ALWAYS_ABOVE);
            const uniformDistance = fairWinRates.reduce((sum, w) => sum + Math.abs(w - 0.5), 0) / fairWinRates.length;

            let pickedDistance = 0;
            const n = 5000;

            for (let i = 0; i < n; ++i) {
                pickedDistance += Math.abs(getFirstMoveWinRate(size, pickFairFirstMove(size)!)! - 0.5);
            }

            assert.ok(pickedDistance / n < uniformDistance);
        });

        it('takes moves closest to 0.5 when not enough fair moves', () => {
            for (const size of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
                const move = pickFairFirstMove(size);

                assert.ok(move !== null);
                assert.ok(getFirstMoveWinRate(size, move) !== null);
            }

            // a2, k10 (0.166), c2, i10 (0.194) and b4, j8 (0.827)
            assert.deepStrictEqual(getFirstMoveCandidates(11)!.map(({ move }) => move).sort(), ['a2', 'b4', 'c2', 'i10', 'j8', 'k10']);
        });

        it('has at least MIN_FIRST_MOVE_CANDIDATES candidates', () => {
            for (let size = 2; size <= 27; ++size) {
                const candidates = getFirstMoveCandidates(size)!;

                assert.ok(candidates.length >= MIN_FIRST_MOVE_CANDIDATES, `${size}: ${candidates.length}`);
                assert.ok(Math.abs(candidates.reduce((sum, { probability }) => sum + probability, 0) - 1) < 1e-9);
            }
        });

        it('returns null when no swap map', () => {
            assert.strictEqual(pickFairFirstMove(28), null);
        });
    });
});
