import assert from 'assert';
import { describe, it } from 'mocha';
import { comparePositions, createCanonicalPosition, type Position } from './position-comparator.js';

describe.only('position-comparator', () => {
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

    it('gives mirrored first move to white on swap-pieces, and ignores pass', () => {
        assert.deepStrictEqual(
            createCanonicalPosition({ boardsize: 11, moves: ['a2', 'swap-pieces', 'd4', 'e6', 'f8', 'pass', 'k11'] }),
            {
                boardsize: 11,
                black: ['d4', 'f8'],
                white: ['b1', 'e6', 'k11'],
            },
        );
    });

    it('finds same position mirrored', () => {
        const reference: Position = { boardsize: 11, moves: ['a2', 'swap-pieces', 'd4', 'e6'] };
        const same: Position = { boardsize: 11, moves: ['a2', 'swap-pieces', 'd4', 'e6'] };
        const other: Position = { boardsize: 11, moves: ['c3', 'g7'] };

        const results = comparePositions(reference, [other, same]);

        assert.strictEqual(results[0].position, same);
        assert.strictEqual(results[0].distance, 0);
        assert.ok(results[1].distance > 0);
    });

    it('does not flag games having many similar stones but still very different', () => {
        const reference: Position = { boardsize: 11, moves: ['a1', 'a2', 'a3', 'a4', 'a5', 'b1', 'b2', 'b3', 'b4', 'b5', 'c1', 'c2', 'c3', 'c4', 'c5'] };
        const playing: Position = { boardsize: 11, moves: ['a1', 'a2', 'a3', 'a4', 'a5'] };

        const results = comparePositions(reference, [playing], 5);

        assert.strictEqual(results.length, 0);
    });
});
