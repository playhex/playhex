import assert from 'assert';
import { ConditionalMoves } from '../models';
import { conditionalMovesMergeMoves, conditionalMovesShift, cleanRedundantUnplayedLines, getNextMovesAfterLine } from '../conditionalMovesUtils';
import { Move } from '../../game-engine';
import { ConditionalMovesTree, ConditionalMovesLine } from '../models/ConditionalMoves';

const create = (tree: ConditionalMovesTree, unplayedLines: ConditionalMovesLine[] = []): ConditionalMoves => {
    const conditionalMoves = new ConditionalMoves();

    conditionalMoves.tree = tree;
    conditionalMoves.unplayedLines = unplayedLines;

    return conditionalMoves;
};

describe('Conditional Moves', () => {
    describe('conditionalMovesShift', () => {
        it('returns only conditional move if matched', async () => {
            const conditionalMoves = create([['a1', 'a2']]);

            const result = conditionalMovesShift(conditionalMoves, Move.fromString('a1'));

            assert.strictEqual(result?.toString(), 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [], 'no reason to add items in unplayed lines');
        });

        it('disable unplayed lines', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, Move.fromString('a1'));

            assert.strictEqual(result?.toString(), 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']], 'unplayed lines have been moved');
        });

        it('played line is shifted', async () => {
            const conditionalMoves = create([
                ['a1', 'a2', [['a3', 'a4', [['e5', 'e6']]], ['b3', 'b4']]],
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, Move.fromString('a1'));

            assert.strictEqual(result?.toString(), 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [['a3', 'a4', [['e5', 'e6']]], ['b3', 'b4']], 'tree is shifted');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']], 'unplayed lines have been moved');
        });

        it('removes lines having conflit with one of played moves', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'a2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, Move.fromString('a1'));

            assert.strictEqual(result?.toString(), 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [], 'unplayed line is not kept because a2 now has a stone');
        });

        it('removes lines having conflit with one of played moves, even inactive ones', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], [
                ['a3', 'a2'],
                ['a3', 'a4'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, Move.fromString('a1'));

            assert.strictEqual(result?.toString(), 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['a3', 'a4'], ['b1', 'b2']], 'a3 a2 is removed because a2 now has a stone');
        });
    });

    describe('conditionalMovesShift', () => {
        it('adds new line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
            ];

            conditionalMovesMergeMoves(tree, ['b1', 'b2']);

            assert.deepStrictEqual(tree, [['a1', 'a2'], ['b1', 'b2']]);
        });

        it('merge simple line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
            ];

            conditionalMovesMergeMoves(tree, ['a1', 'a2', 'a3', 'a4']);

            assert.deepStrictEqual(tree, [['a1', 'a2', [['a3', 'a4']]]]);
        });

        it('merge less simple line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2', [['b3', 'b4'], ['c3', 'c4']]],
            ];

            conditionalMovesMergeMoves(tree, ['b1', 'b2', 'c3', 'c4', 'b5', 'b6']);

            assert.deepStrictEqual(tree, [
                ['a1', 'a2'],
                ['b1', 'b2', [['b3', 'b4'], ['c3', 'c4', [['b5', 'b6']]]]],
            ]);
        });
    });

    describe('cleanRedundantUnplayedLines', () => {
        it('removes simple redundant lines', () => {
            const tree: ConditionalMovesTree = [['a1', 'a2']];

            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            const conditionalMoves = create(tree, unplayedLines);

            cleanRedundantUnplayedLines(conditionalMoves);

            const expected: ConditionalMovesLine[] = [
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(conditionalMoves.unplayedLines, expected);
        });

        it('removes if unplayed line is a subset of line', () => {
            const tree: ConditionalMovesTree = [['a1', 'a2', [['a3', 'a4']]]];

            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            const conditionalMoves = create(tree, unplayedLines);

            cleanRedundantUnplayedLines(conditionalMoves);

            const expected: ConditionalMovesLine[] = [
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(conditionalMoves.unplayedLines, expected);
        });

        it('removes line but keeps variant', () => {
            const tree: ConditionalMovesTree = [['a1', 'a2', [['a3', 'a4']]]];

            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
            ];

            const conditionalMoves = create(tree, unplayedLines);

            cleanRedundantUnplayedLines(conditionalMoves);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2', [['b3', 'b4']]],
            ];

            assert.deepStrictEqual(conditionalMoves.unplayedLines, expected);
        });

        it('removes all lines when included, but keeps variants', () => {
            const tree: ConditionalMovesTree = [['a1', 'a2', [['a3', 'a4']]]];

            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['a1', 'a2', [['c3', 'c4'], ['b3', 'b4']]],
                ['d1', 'd2'],
            ];

            const conditionalMoves = create(tree, unplayedLines);

            cleanRedundantUnplayedLines(conditionalMoves);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2', [['b3', 'b4']]],
                ['a1', 'a2', [['c3', 'c4'], ['b3', 'b4']]],
                ['d1', 'd2'],
            ];

            assert.deepStrictEqual(conditionalMoves.unplayedLines, expected);
        });

        it('does nothing when no redundant line', () => {
            const tree: ConditionalMovesTree = [['e1', 'e2', [['e3', 'e4']]]];

            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['a1', 'a2', [['c3', 'c4'], ['b3', 'b4']]],
                ['d1', 'd2'],
            ];

            const conditionalMoves = create(tree, unplayedLines);

            cleanRedundantUnplayedLines(conditionalMoves);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['a1', 'a2', [['c3', 'c4'], ['b3', 'b4']]],
                ['d1', 'd2'],
            ];

            assert.deepStrictEqual(conditionalMoves.unplayedLines, expected);
        });
    });

    describe('getNextMovesAfterLine', () => {
        it('returns next conditional moves on empty line', () => {
            const next = getNextMovesAfterLine([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], []);

            assert.deepStrictEqual(next, ['a1', 'b1']);
        });

        it('returns answer on conditional move', () => {
            const next = getNextMovesAfterLine([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], ['b1']);

            assert.deepStrictEqual(next, ['b2']);
        });

        it('returns next conditional moves on deep line', () => {
            const next = getNextMovesAfterLine([
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['b1', 'b2', [['c3', 'c4'], ['d3', 'd4']]],
            ], ['b1', 'b2']);

            assert.deepStrictEqual(next, ['c3', 'd3']);
        });

        it('returns answer on deep line', () => {
            const next = getNextMovesAfterLine([
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['b1', 'b2', [['c3', 'c4'], ['d3', 'd4']]],
            ], ['b1', 'b2', 'd3']);

            assert.deepStrictEqual(next, ['d4']);
        });

        it('returns empty on tail', () => {
            const next = getNextMovesAfterLine([
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['b1', 'b2', [['c3', 'c4'], ['d3', 'd4']]],
            ], ['a1', 'a2', 'b3', 'b4']);

            assert.deepStrictEqual(next, []);
        });
    });
});
