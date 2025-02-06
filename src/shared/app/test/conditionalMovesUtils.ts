import assert from 'assert';
import { conditionalMovesMergeMoves, conditionalMovesShift, clearDuplicatedUnplayedLines, getNextMovesAfterLine, conditionalMovesCut, ConditionalMovesStruct, isSameLines, validateTreeFormat } from '../conditionalMovesUtils';
import { ConditionalMovesTree, ConditionalMovesLine } from '../models/ConditionalMoves';

const create = (tree: ConditionalMovesTree, unplayedLines: ConditionalMovesLine[] = []): ConditionalMovesStruct => {
    return {
        tree,
        unplayedLines,
    };
};

describe('Conditional Moves', () => {
    describe('conditionalMovesShift', () => {
        it('returns only conditional move if matched', async () => {
            const conditionalMoves = create([['a1', 'a2']]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [], 'no reason to add items in unplayed lines');
        });

        it('disable unplayed lines', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']], 'unplayed lines have been moved');
        });

        it('played line is shifted', async () => {
            const conditionalMoves = create([
                ['a1', 'a2', [['a3', 'a4', [['e5', 'e6']]], ['b3', 'b4']]],
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [['a3', 'a4', [['e5', 'e6']]], ['b3', 'b4']], 'tree is shifted');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']], 'unplayed lines have been moved');
        });

        it('unplayed lines are added at the beginning of unplayed lines', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], [
                ['c1', 'c2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'b1');

            assert.strictEqual(result, 'b2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['a1', 'a2'], ['c1', 'c2']]);
        });

        it('removes lines having conflit with one of played moves', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'a2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
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

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2'], ['a3', 'a4']], 'a3 a2 is removed because a2 now has a stone');
        });

        it('do not add unplayed line if duplicated', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], [
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, 'a2');
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']]);
        });

        it('do not add unplayed line if duplicated, even when no conditional move matched', async () => {
            const conditionalMoves = create([
                ['a1', 'a2'],
                ['b1', 'b2'],
            ], [
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'c1');

            assert.strictEqual(result, null);
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['a1', 'a2'], ['b1', 'b2']]);
        });

        it('do not add unplayed line if duplicated, even when conditional move matched but no answer defined', async () => {
            const conditionalMoves = create([
                ['a1'],
                ['b1', 'b2'],
            ], [
                ['b1', 'b2'],
            ]);

            const result = conditionalMovesShift(conditionalMoves, 'a1');

            assert.strictEqual(result, null);
            assert.deepStrictEqual(conditionalMoves.tree, [], 'tree is now empty');
            assert.deepStrictEqual(conditionalMoves.unplayedLines, [['b1', 'b2']]);
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

    describe('clearDuplicatedUnplayedLines', () => {
        it('removes simple duplicated lines', () => {
            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
                ['a1', 'a2'],
            ];

            const actual = clearDuplicatedUnplayedLines(unplayedLines);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(actual, expected);
        });

        it('does nothing when no duplicates', () => {
            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            const actual = clearDuplicatedUnplayedLines(unplayedLines);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(actual, expected);
        });

        it('removes deep duplicated lines', () => {
            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2', [['a3', 'a4']]],
                ['b1', 'b2'],
                ['a1', 'a2', [['a3', 'a4']]],
            ];

            const actual = clearDuplicatedUnplayedLines(unplayedLines);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2', [['a3', 'a4']]],
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(actual, expected);
        });

        it('removes deep duplicated lines, order insensitive', () => {
            const unplayedLines: ConditionalMovesLine[] = [
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['b1', 'b2'],
                ['a1', 'a2', [['b3', 'b4'], ['a3', 'a4']]],
            ];

            const actual = clearDuplicatedUnplayedLines(unplayedLines);

            const expected: ConditionalMovesLine[] = [
                ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ['b1', 'b2'],
            ];

            assert.deepStrictEqual(actual, expected);
        });
    });

    describe('isSameLines', () => {
        it('compares two simple lines', () => {
            assert.strictEqual(isSameLines(['a1', 'a2'], ['a1', 'a2']), true, 'a1 a2');
            assert.strictEqual(isSameLines(['a1', 'a2'], ['a1', 'b2']), false, 'a1 a2 !== a1 b2');
            assert.strictEqual(isSameLines(['b1', 'a2'], ['a1', 'a2']), false, 'b1 a2 !== a1 a2');
        });

        it('compares two lines with subLines', () => {
            assert.strictEqual(isSameLines(['a1', 'a2', [['a3', 'a4']]], ['a1', 'a2', [['a3', 'a4']]]), true, 'a1 a2 a3 a4');
            assert.strictEqual(isSameLines(['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]], ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]]), true, 'a1 a2 a3 a4 / b3 b4');
            assert.strictEqual(isSameLines(['a1', 'a2', [['a3', 'a4']]], ['a1', 'a2', [['a3', 'b4']]]), false, 'a1 a2 a3 a4/b4');
            assert.strictEqual(isSameLines(['a1', 'a2', [['b3', 'a4']]], ['a1', 'a2', [['a3', 'a4']]]), false, 'a1 a2 b3/a3 a4');
            assert.strictEqual(isSameLines(['a1', 'b2', [['a3', 'a4']]], ['a1', 'a2', [['a3', 'a4']]]), false, 'a1 b2/a2 a3 a4');
        });

        it('compares two lines with subLines, order insensitive', () => {
            assert.strictEqual(isSameLines(['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]], ['a1', 'a2', [['b3', 'b4'], ['a3', 'a4']]]), true);
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

    describe('conditionalMovesCut', () => {
        it('cut simple line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            conditionalMovesCut(tree, ['a1']);

            assert.deepStrictEqual(tree, [['b1', 'b2']]);
        });

        it('cut simple answer', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            conditionalMovesCut(tree, ['a1', 'a2']);

            assert.deepStrictEqual(tree, [['a1'], ['b1', 'b2']]);
        });

        it('cuts all when passing empty', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            conditionalMovesCut(tree, []);

            assert.deepStrictEqual(tree, []);
        });

        it('does nothing when passing inexistant line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            conditionalMovesCut(tree, ['c1']);

            assert.deepStrictEqual(tree, [['a1', 'a2'], ['b1', 'b2']]);
        });

        it('does nothing when passing inexistant answer', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2'],
                ['b1', 'b2'],
            ];

            conditionalMovesCut(tree, ['a1', 'c2']);

            assert.deepStrictEqual(tree, [['a1', 'a2'], ['b1', 'b2']]);
        });

        it('cuts subtree', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2', [
                    ['a3', 'a4'],
                    ['b3', 'b4'],
                ]],
                ['a1', 'a2'],
            ];

            conditionalMovesCut(tree, ['a1', 'a2', 'a3']);

            assert.deepStrictEqual(tree, [
                ['a1', 'a2', [
                    ['b3', 'b4'],
                ]],
                ['a1', 'a2'],
            ]);
        });

        it('cuts subtree answer', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2', [
                    ['a3', 'a4'],
                    ['b3', 'b4'],
                ]],
                ['a1', 'a2'],
            ];

            conditionalMovesCut(tree, ['a1', 'a2', 'a3', 'a4']);

            assert.deepStrictEqual(tree, [
                ['a1', 'a2', [
                    ['a3'],
                    ['b3', 'b4'],
                ]],
                ['a1', 'a2'],
            ]);
        });

        it('cuts full line', () => {
            const tree: ConditionalMovesTree = [
                ['a1', 'a2', [
                    ['a3', 'a4'],
                    ['b3', 'b4'],
                ]],
                ['c1', 'c2'],
            ];

            conditionalMovesCut(tree, ['a1']);

            assert.deepStrictEqual(tree, [
                ['c1', 'c2'],
            ]);
        });
    });

    describe('validateTreeFormat', () => {
        it('validates tree format', () => {
            const valids: [string, ConditionalMovesTree][] = [
                ['empty tree', []],

                ['only move', [
                    ['a1'],
                ]],

                ['move answer', [
                    ['a1', 'a2'],
                ]],

                ['multiple simple lines', [
                    ['a1', 'a2'],
                    ['b1', 'b2'],
                    ['c1'],
                ]],

                ['single subline', [
                    ['a1', 'a2', [['a3', 'a4']]],
                ]],

                ['subline move only', [
                    ['a1', 'a2', [['a3']]],
                ]],

                ['2 sublines', [
                    ['a1', 'a2', [['a3', 'a4'], ['b3', 'b4']]],
                ]],

                ['complex valid tree', [
                    ['a1', 'a2', [
                        ['a3', 'a4'], ['c3'], ['b3', 'b4', [['a5', 'a6']]],
                    ]],
                    ['b1'],
                    ['c1', 'c2', [['c3']]],
                ]],
            ];

            for (const [message, tree] of valids) {
                assert.strictEqual(validateTreeFormat(tree), true, message);
            }

            // invalid formats
            const invalids: [string, unknown][] = [
                ['empty line', [[]]],

                ['not an array, object', {}],

                ['not an array, string', 'a1'],

                ['3 moves', [
                    ['a1', 'a2', 'a3'],
                ]],

                ['subline not a tree', [
                    ['a1', 'a2', ['a3', 'a4']],
                ]],

                ['empty sublines', [
                    ['a1', 'a2', []],
                ]],

                ['empty subline', [
                    ['a1', 'a2', [[]]],
                ]],

                ['3 moves in subline', [
                    ['a1', 'a2', [['a3', 'a4', 'a5']]],
                ]],
            ];

            for (const [message, tree] of invalids) {
                assert.strictEqual(validateTreeFormat(tree), false, message);
            }
        });
    });
});
