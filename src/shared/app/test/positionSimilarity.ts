import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, type Move } from '@playhex/move-notation';
import { createCanonicalPosition, jaccardSimilarity } from '../../position-comparator/position-comparator.js';
import { isSimilarEnough } from '../../position-comparator/position-similarity.js';

const BOARDSIZE = 19;

/**
 * n distinct cells, on the top of the board
 */
const cells = (n: number, offset = 0): Move[] => Array.from(
    { length: n },
    (_, i) => coordsToMove({ row: Math.floor((i + offset) / BOARDSIZE), col: (i + offset) % BOARDSIZE }),
);

/**
 * n stones, alternating black and white
 */
const position = (n: number): Move[] => cells(n);

/**
 * Same position with the `changed` last stones moved to other cells, colors kept
 */
const changeStones = (moves: Move[], changed: number): Move[] => [
    ...moves.slice(0, moves.length - changed),
    ...cells(changed, 200),
];

/**
 * Same position with the `removed` last stones removed
 */
const removeStones = (moves: Move[], removed: number): Move[] => moves.slice(0, moves.length - removed);

/**
 * Same position with `added` extra stones, colors keep alternating
 */
const addStones = (moves: Move[], added: number): Move[] => [...moves, ...cells(added, 200)];

const shouldFlag = (analyzed: Move[], playing: Move[]): boolean => isSimilarEnough(jaccardSimilarity(
    createCanonicalPosition({ boardsize: BOARDSIZE, moves: analyzed }),
    createCanonicalPosition({ boardsize: BOARDSIZE, moves: playing }),
));

describe('positionSimilarity', () => {
    it('computes Jaccard index', () => {
        const playing = position(10);

        assert.deepStrictEqual(
            jaccardSimilarity(
                createCanonicalPosition({ boardsize: BOARDSIZE, moves: changeStones(playing, 1) }),
                createCanonicalPosition({ boardsize: BOARDSIZE, moves: playing }),
            ),
            { similarity: 9 / 11, common: 9 },
        );
    });

    it('returns 0 for empty positions', () => {
        assert.deepStrictEqual(
            jaccardSimilarity({ boardsize: 11, black: [], white: [] }, { boardsize: 11, black: [], white: [] }),
            { similarity: 0, common: 0 },
        );
    });

    it('does not consider same cell with different color as common', () => {
        assert.strictEqual(
            jaccardSimilarity(
                { boardsize: 11, black: ['a1'], white: ['b2'] },
                { boardsize: 11, black: ['b2'], white: ['a1'] },
            ).common,
            0,
        );
    });

    describe('flag or not', () => {
        it('flags same position', () => assert.strictEqual(shouldFlag(position(10), position(10)), true));
        it('flags same position played in a different order', () => {
            const playing = position(10);

            // reverse order of (black, white) moves pairs, so each stone keeps its color
            const reordered = [4, 3, 2, 1, 0].flatMap(pair => [playing[2 * pair], playing[2 * pair + 1]]);

            assert.strictEqual(shouldFlag(reordered, playing), true);
        });

        it('flags 8 identical stones: f8 h4 g8 g4 e7 f4 d9 e5', () => {
            const moves: Move[] = ['f8', 'h4', 'g8', 'g4', 'e7', 'f4', 'd9', 'e5'];

            assert.strictEqual(shouldFlag(moves, [...moves]), true);
        });

        it('does not flag 7 stones, 1 changed (common opening)', () => assert.strictEqual(shouldFlag(changeStones(position(7), 1), position(7)), false));
        it('does not flag 7 identical stones (common opening)', () => assert.strictEqual(shouldFlag(position(7), position(7)), false));
        it('flags 10 stones, 1 changed', () => assert.strictEqual(shouldFlag(changeStones(position(10), 1), position(10)), true));
        it('does not flag 10 stones, 2 changed', () => assert.strictEqual(shouldFlag(changeStones(position(10), 2), position(10)), false));
        it('flags 30 stones, 3 changed', () => assert.strictEqual(shouldFlag(changeStones(position(30), 3), position(30)), true));
        it('does not flag 30 stones, 4 changed', () => assert.strictEqual(shouldFlag(changeStones(position(30), 4), position(30)), false));
        it('flags 30 stones, with 3 extra stones', () => assert.strictEqual(shouldFlag(addStones(position(30), 3), position(30)), true));
        it('flags 30 stones, with 6 stones removed', () => assert.strictEqual(shouldFlag(removeStones(position(30), 6), position(30)), true));
        it('does not flag 30 stones, with 10 stones removed', () => assert.strictEqual(shouldFlag(removeStones(position(30), 10), position(30)), false));
    });
});
