import assert from 'assert';
import { describe, it } from 'mocha';
import { type HexMove } from '../../../packages/move-notation/hex-move-notation.js';
import { mirrorCenter, mirrorMove, mirrorShortDiagonal, type Move } from '../../../packages/move-notation/move-notation.js';
import { type CandidatePosition, comparePositions, createCanonicalPosition, InvalidPositionError, MIRROR_CENTER, MIRROR_LONG_DIAGONAL, MIRROR_SHORT_DIAGONAL, normalizeCanonicalPosition, type Position } from '../../position-comparator/position-comparator.js';

/**
 * A 12 stones game on 11x11
 */
const gameMoves: Move[] = ['f6', 'f5', 'g7', 'd6', 'e4', 'h4', 'f7', 'b7', 'g8', 'j3', 'g4', 'g5'];

describe('positionComparator', () => {
    describe('createCanonicalPosition', () => {
        it('creates canonical position, first player is black', () => {
            assert.deepStrictEqual(
                createCanonicalPosition({ boardsize: 11, moves: ['a2', 'd4', 'e6'] }),
                {
                    boardsize: 11,
                    black: ['a2', 'e6'],
                    white: ['d4'],
                },
            );
        });

        it('gives mirrored first move to white on swap-pieces, and pass changes turn', () => {
            assert.deepStrictEqual(
                createCanonicalPosition({ boardsize: 11, moves: ['a2', 'swap-pieces', 'd4', 'e6', 'f8', 'pass', 'k11'] }),
                {
                    boardsize: 11,
                    black: ['d4', 'f8', 'k11'],
                    white: ['b1', 'e6'],
                },
            );
        });

        it('throws on unexpected swap-pieces', () => {
            assert.throws(() => createCanonicalPosition({ boardsize: 11, moves: ['a2', 'b3', 'swap-pieces'] }), InvalidPositionError);
        });

        it('throws on a move played on an occupied cell', () => {
            assert.throws(() => createCanonicalPosition({ boardsize: 11, moves: ['a2', 'b3', 'a2'] }), InvalidPositionError);
            assert.throws(() => createCanonicalPosition({ boardsize: 11, moves: ['a2', 'b3', 'c4', 'b3'] }), InvalidPositionError);
        });

        it('moves occupied cell on swap-pieces', () => {
            assert.throws(() => createCanonicalPosition({ boardsize: 11, moves: ['a2', 'swap-pieces', 'b1'] }), InvalidPositionError);
            assert.doesNotThrow(() => createCanonicalPosition({ boardsize: 11, moves: ['a2', 'swap-pieces', 'a2'] }));
        });
    });

    describe('normalizeCanonicalPosition', () => {
        it('normalizes and sorts moves', () => {
            assert.deepStrictEqual(
                normalizeCanonicalPosition({ boardsize: 11, black: ['f6', 'a01', '"c3"'] as Move[], white: ['k11', 'b02'] as Move[] }),
                {
                    boardsize: 11,
                    black: ['a1', 'c3', 'f6'],
                    white: ['b2', 'k11'],
                },
            );
        });

        it('throws on duplicate stones, same color or not, even with alternative notation', () => {
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['a1', 'a1'], white: [] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['a1'], white: ['a1'] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['a1', 'a01'] as Move[], white: [] }), InvalidPositionError);
        });

        it('throws on out of board or invalid moves', () => {
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['l1'], white: [] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['a12'], white: [] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['a0'], white: [] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['pass'] as unknown as Move[], white: [] }), InvalidPositionError);
            assert.throws(() => normalizeCanonicalPosition({ boardsize: 11, black: ['swap-pieces'] as unknown as Move[], white: [] }), InvalidPositionError);
        });
    });

    describe('comparePositions', () => {
        const other: Position = { boardsize: 11, moves: ['c3', 'g7', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'] };

        it('finds same position', () => {
            const same: Position = { boardsize: 11, moves: [...gameMoves] };
            const results = comparePositions({ boardsize: 11, moves: gameMoves }, [other, same]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].position, same);
            assert.strictEqual(results[0].similarity, 1);
            assert.strictEqual(results[0].common, 12);
            assert.strictEqual(results[0].mirror, false);
        });

        it('finds bot game replaying moves of a playing game', () => {
            const moves: HexMove[] = ['j2', 'swap-pieces', 'h4', 'c1', 'd4', 'h1', 'h7', 'd2', 'd9', 'f9', 'd6', 'k9'];
            const results = comparePositions({ boardsize: 11, moves }, [{ boardsize: 11, moves: [...moves] }]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
        });

        it('finds same position played after swap-pieces', () => {
            const reference: Position = { boardsize: 11, moves: ['a2', 'swap-pieces', ...gameMoves] };
            const results = comparePositions(reference, [{ boardsize: 11, moves: ['a2', 'swap-pieces', ...gameMoves] }]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
        });

        it('finds position mirrored around long diagonal (colors swapped)', () => {
            // mirrored position: white plays mirror of black moves, so prepend a pass to shift turns
            const mirrored: Position = { boardsize: 11, moves: ['pass', ...gameMoves.map(move => mirrorMove(move))] };
            const results = comparePositions({ boardsize: 11, moves: gameMoves }, [mirrored]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
            assert.strictEqual(results[0].mirror, MIRROR_LONG_DIAGONAL);
        });

        it('finds position mirrored around short diagonal (colors swapped)', () => {
            const mirrored: Position = { boardsize: 11, moves: ['pass', ...gameMoves.map(move => mirrorShortDiagonal(move, 11))] };
            const results = comparePositions({ boardsize: 11, moves: gameMoves }, [mirrored]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
            assert.strictEqual(results[0].mirror, MIRROR_SHORT_DIAGONAL);
        });

        it('finds position mirrored around center (colors kept)', () => {
            const mirrored: Position = { boardsize: 11, moves: gameMoves.map(move => mirrorCenter(move, 11)) };
            const results = comparePositions({ boardsize: 11, moves: gameMoves }, [mirrored]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
            assert.strictEqual(results[0].mirror, MIRROR_CENTER);
        });

        it('finds same moves copied on a board one size bigger', () => {
            const playing: Position = { boardsize: 11, moves: gameMoves };
            const results = comparePositions({ boardsize: 12, moves: gameMoves }, [playing]);

            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].similarity, 1);
            assert.strictEqual(results[0].mirror, false);
        });

        it('does not check mirrors when copied on a board one size bigger', () => {
            const playing: Position = { boardsize: 11, moves: gameMoves.map(move => mirrorCenter(move, 11)) };

            assert.strictEqual(comparePositions({ boardsize: 12, moves: gameMoves }, [playing]).length, 0);
        });

        it('ignores candidates on other board sizes', () => {
            assert.strictEqual(comparePositions({ boardsize: 11, moves: gameMoves }, [{ boardsize: 12, moves: gameMoves }]).length, 0);
            assert.strictEqual(comparePositions({ boardsize: 13, moves: gameMoves }, [{ boardsize: 11, moves: gameMoves }]).length, 0);
        });

        it('returns only one result per candidate, with the best mirror', () => {
            // symmetric around center: identity and center mirror both match
            const symmetric: HexMove[] = ['f6', 'a1', 'b2', 'k11', 'j10', 'a2', 'b3', 'k10', 'j9', 'c1', 'c2', 'i11', 'i10'];

            assert.strictEqual(comparePositions({ boardsize: 11, moves: symmetric }, [{ boardsize: 11, moves: symmetric }]).length, 1);
        });

        it('does not flag short common openings', () => {
            const opening: HexMove[] = ['a2', 'swap-pieces', 'f6', 'e7', 'd9'];

            assert.strictEqual(comparePositions({ boardsize: 11, moves: opening }, [{ boardsize: 11, moves: opening }]).length, 0);
        });

        it('accepts canonical positions, and keeps candidate source', () => {
            const candidate: CandidatePosition = {
                ...createCanonicalPosition({ boardsize: 11, moves: gameMoves }),
                gamePublicId: 'abc',
                source: 'https://example.org/games/abc',
            };

            const results = comparePositions(createCanonicalPosition({ boardsize: 11, moves: gameMoves }), [candidate]);

            assert.strictEqual(results[0].position.gamePublicId, 'abc');
            assert.strictEqual(results[0].position.source, 'https://example.org/games/abc');
        });

        it('sorts results by similarity, and accepts a custom predicate', () => {
            const almost: Position = { boardsize: 11, moves: [...gameMoves.slice(0, 11), 'a1'] };
            const same: Position = { boardsize: 11, moves: gameMoves };

            const results = comparePositions({ boardsize: 11, moves: gameMoves }, [other, almost, same], () => true, 0);

            assert.deepStrictEqual(results.map(r => r.position), [same, almost, other]);
        });
    });
});
