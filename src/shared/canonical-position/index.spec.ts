import assert from 'assert';
import { describe, it } from 'mocha';
import { compareAllPositions, mirrorCenter, mirrorLongDiagonal, mirrorShortDiagonal } from './index.js';

describe('CanonicalPosition', () => {
    describe('compareAllPositions', () => {
        it('returns no diff for identical positions', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    11,
                ),
                { missing: [], extra: [] },
            );
        });

        it('detects a stone missing at the end of the game', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7',
                    11,
                ),
                { missing: ['a8'], extra: [] },
            );
        });

        it('detects an extra stone at the end of the game', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7',
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    11,
                ),
                { missing: [], extra: ['a8'] },
            );
        });

        it('detects multiple stones missing at the end of the game, of both colors', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3',
                    11,
                ),
                { missing: ['a7', 'a8'], extra: [] },
            );
        });

        it('detects a stone replaced by another one', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 k1 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    11,
                ),
                { missing: ['f4'], extra: ['k1'] },
            );
        });

        it('detects positions with no common stone at all', () => {
            assert.deepStrictEqual(
                compareAllPositions('a2', 'e5', 11),
                { missing: ['a2'], extra: ['e5'] },
            );
        });

        it('detects a position mirrored around the long diagonal (colors swapped, board size independent)', () => {
            // reference: black a2, white b3
            // check: black c2 (= mirror of white b3), white b1 (= mirror of black a2)
            assert.deepStrictEqual(
                compareAllPositions('a2 b3', 'c2 b1', 11),
                { missing: [], extra: [] },
            );
        });

        it('detects a position mirrored around the short diagonal (colors swapped, board size dependent)', () => {
            // reference: black a2, white b3
            // check: black i10 (= mirror of white b3), white j11 (= mirror of black a2)
            assert.deepStrictEqual(
                compareAllPositions('a2 b3', 'i10 j11', 11),
                { missing: [], extra: [] },
            );
        });

        it('detects a position mirrored around the center (colors kept, board size dependent)', () => {
            // reference: black a2, white b3
            // check: black k10 (= mirror of black a2), white j9 (= mirror of white b3)
            assert.deepStrictEqual(
                compareAllPositions('a2 b3', 'k10 j9', 11),
                { missing: [], extra: [] },
            );
        });

        it('detects a single stone mirrored around the center', () => {
            // a2 mirrored around the center of an 11x11 board is k10
            assert.deepStrictEqual(
                compareAllPositions('a2', 'k10', 11),
                { missing: [], extra: [] },
            );
        });

        it('picks the mirror with the smallest distance when no mirror is a perfect match', () => {
            const diff = compareAllPositions('a2 b3 c4', 'k10 j9 f6', 11);

            assert.strictEqual(diff.missing.length, diff.extra.length);
            assert.strictEqual(diff.missing.length, 1);
        });

        it('finds several diffs in two very different positions, with few moves in common', () => {
            // only a2 is common to both positions, all other stones differ
            assert.deepStrictEqual(
                compareAllPositions(
                    'a2 b3 c4 d5',
                    'a2 f6 g7 h8',
                    11,
                ),
                { missing: ['c4', 'b3', 'd5'], extra: ['g7', 'f6', 'h8'] },
            );
        });

        it('finds many diffs in two mirrored games', () => {
            // mirroredGame is `game` mirrored around the center, with the 3rd move,
            // 11th move and last move altered, so the closest mirror (center) still has 5 diffs
            assert.deepStrictEqual(
                compareAllPositions(
                    'f6 f5 g7 d6 e4 h4 f7 b7 g8 j3 g4 g5 f4 e6 c7 c6 i3 i4 k4 k3 a7 a8',
                    'f6 f7 a1 h6 g8 d8 f5 j5 e4 b9 a3 e7 f8 g6 i5 i6 c9 c8 a8 a9 k5',
                    11,
                ),
                { missing: ['g7', 'g4', 'a8'], extra: ['k11', 'k9'] },
            );
        });

        it('compares a moves sequence (string) against a raw standardized position', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'a2 b3',
                    { boardsize: 11, black: [{ row: 1, col: 0 }], white: [{ row: 2, col: 1 }] },
                    11,
                ),
                { missing: [], extra: [] },
            );
        });

        it('detects a diff when comparing a moves sequence to a raw standardized position with an extra stone', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    'a2 b3',
                    { boardsize: 11, black: [{ row: 1, col: 0 }], white: [{ row: 2, col: 1 }, { row: 3, col: 3 }] },
                    11,
                ),
                { missing: [], extra: ['d4'] },
            );
        });

        it('compares a raw standardized position (as reference) against a moves sequence', () => {
            assert.deepStrictEqual(
                compareAllPositions(
                    { boardsize: 11, black: [{ row: 1, col: 0 }], white: [{ row: 2, col: 1 }] },
                    'a2 b3',
                    11,
                ),
                { missing: [], extra: [] },
            );
        });
    });

    describe('mirror functions', () => {
        it('mirrorLongDiagonal', () => {
            assert.deepStrictEqual(mirrorLongDiagonal({ row: 1, col: 2 }), { row: 2, col: 1 });
        });

        it('mirrorShortDiagonal', () => {
            assert.deepStrictEqual(mirrorShortDiagonal({ row: 0, col: 0 }, 11), { row: 10, col: 10 });
            assert.deepStrictEqual(mirrorShortDiagonal({ row: 0, col: 0 }, 12), { row: 11, col: 11 });
            assert.deepStrictEqual(mirrorShortDiagonal({ row: 1, col: 0 }, 11), { row: 10, col: 9 });
        });

        it('mirrorCenter', () => {
            assert.deepStrictEqual(mirrorCenter({ row: 0, col: 0 }, 11), { row: 10, col: 10 });
            assert.deepStrictEqual(mirrorCenter({ row: 0, col: 0 }, 12), { row: 11, col: 11 });
            assert.deepStrictEqual(mirrorCenter({ row: 1, col: 0 }, 11), { row: 9, col: 10 });
        });
    });
});
