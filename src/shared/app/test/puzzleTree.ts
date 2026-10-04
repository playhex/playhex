import assert from 'assert';
import { describe, it } from 'mocha';
import { createNodeResolver, findChild, findElseNode, findSamePositionNode, findSolution, findTranspositions, getComputerAnswer, getNodeResult, getPositionKey, isDraftBlockingError, normalizePuzzleText, puzzleErrorToString, validatePuzzle, type NodeResolver, type PuzzleDefinition, type PuzzleNode } from '../puzzles/puzzleTree.js';

const noTransposition: NodeResolver = node => node;

const tree: PuzzleNode = {
    message: 'Red to play',
    children: [
        {
            move: 'c3',
            children: [
                {
                    move: 'b3',
                    message: 'Now block',
                    children: [
                        { move: 'b4', message: 'Well done' },
                        { move: 'd2' },
                    ],
                },
            ],
        },
        { move: 'a1', result: 'failed', message: 'Blue answers b2' },
        { else: 'd4', message: 'Blue cuts' },
    ],
};

const createPuzzle = (overrides: Partial<PuzzleDefinition> = {}): PuzzleDefinition => ({
    title: 'Test',
    boardsize: 5,
    redStones: ['a5', 'b5', 'c5'],
    blueStones: ['e1'],
    playerColor: 0,
    tree,
    ...overrides,
});

describe('puzzleTree', () => {
    it('navigates tree', () => {
        const c3 = findChild(tree, 'c3');

        assert.ok(c3);
        assert.strictEqual(findChild(tree, 'e5'), null);
        assert.strictEqual(getNodeResult(c3), null);

        const answer = getComputerAnswer(c3);

        assert.strictEqual(answer?.move, 'b3');
        assert.strictEqual(getNodeResult(answer), null);
        assert.strictEqual(getNodeResult(findChild(answer, 'b4')!), 'solved');
        assert.strictEqual(getComputerAnswer(findChild(answer, 'b4')!), null);
    });

    it('ends with explicit result', () => {
        assert.strictEqual(getNodeResult(findChild(tree, 'a1')!), 'failed');
    });

    it('finds else node', () => {
        const elseNode = findElseNode(tree);

        assert.strictEqual(elseNode?.else, 'd4');
        assert.strictEqual(getNodeResult(elseNode), 'failed');
        assert.strictEqual(findChild(tree, 'd4'), null, 'else answer is not a player move');
        assert.strictEqual(findElseNode(findChild(tree, 'c3')!), null);
    });

    it('does not end again in continuation', () => {
        const continuation: PuzzleNode = { move: 'b4', result: 'solved', children: [{ move: 'a1' }] };

        assert.strictEqual(getNodeResult(continuation), 'solved');
        assert.strictEqual(getNodeResult(continuation.children![0], true), null);
    });

    it('finds solution', () => {
        const resolve = createNodeResolver(tree);

        assert.deepStrictEqual(findSolution(tree, resolve)?.map(node => node.move), ['c3', 'b3', 'b4']);

        const c3 = findChild(tree, 'c3')!;

        assert.deepStrictEqual(findSolution(c3, resolve, true)?.map(node => node.move), ['b3', 'b4']);
        assert.deepStrictEqual(findSolution(findChild(getComputerAnswer(c3)!, 'b4')!, resolve, true), []);
        assert.strictEqual(findSolution(findChild(tree, 'a1')!, resolve, true), null);

        // Ignores else node
        assert.strictEqual(findSolution({ children: [{ else: 'a1' }] }, noTransposition), null);

        // Stops at solved node, without continuation
        assert.deepStrictEqual(findSolution({
            children: [{ move: 'a1', result: 'solved', children: [{ move: 'b2' }] }],
        }, noTransposition)?.map(node => node.move), ['a1']);

        // Skips first player move when it leads to a failure
        assert.deepStrictEqual(findSolution({
            children: [
                { move: 'a1', children: [{ move: 'b2', result: 'failed' }] },
                { move: 'c3' },
            ],
        }, noTransposition)?.map(node => node.move), ['c3']);
    });

    it('validates a valid puzzle', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle()), []);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ title: null })), [], 'title is optional');
    });

    it('accepts last move from initial stones', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ lastMove: 'e1' })), []);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ lastMove: 'a5', playerColor: 1 })), []);
    });

    it('accepts else answer on expected move', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [{ move: 'c3' }, { else: 'c3' }] } })), []);
    });

    it('accepts continuation after the end', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', result: 'failed', message: 'Blue cuts', children: [{ move: 'b3', children: [{ move: 'b4' }] }] }, { move: 'd2' }] },
        })), []);
    });

    it('accepts illegal positions', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ redStones: ['e2', 'e3', 'e4', 'e5'], blueStones: [] })), []);
    });

    it('accepts disabled cells', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['e4', 'e5'] })), []);
    });

    it('rejects stones and moves on disabled cells', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['a5'] })), [{ code: 'set_twice', params: { move: 'a5' } }], 'initial stone');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['b3'] })), [{ code: 'occupied', path: ['c3'], params: { move: 'b3' } }], 'tree move');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['d4'] })), [{ code: 'occupied', path: [], params: { move: 'd4' } }], 'else answer');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['f6'] })), [{ code: 'outside_board', params: { move: 'f6' } }], 'outside board');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: 'e5' as never })), [{ code: 'invalid_stones' }], 'not a list');
    });

    it('rejects invalid puzzles', () => {
        assert.strictEqual(validatePuzzle(createPuzzle({ boardsize: 0 })).length, 1);
        assert.strictEqual(validatePuzzle(createPuzzle({ boardsize: 2 })).length > 0, true, 'moves outside board');
        assert.strictEqual(validatePuzzle(createPuzzle({ blueStones: ['a5'] })).length, 1, 'stone set twice');
        assert.strictEqual(validatePuzzle(createPuzzle({ redStones: ['c3'] })).length, 1, 'move on occupied cell');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', children: [{ move: 'c3' }] }] },
        })), [{ code: 'occupied', path: ['c3'], params: { move: 'c3' } }], 'error with path');
        assert.strictEqual(validatePuzzle(createPuzzle({ lastMove: 'a1' })).length, 1, 'last move not an initial stone');
        assert.strictEqual(validatePuzzle(createPuzzle({ lastMove: 'a5' })).length, 1, 'last move of player color');
        assert.strictEqual(validatePuzzle(createPuzzle({ lastMove: 'e1', playerColor: 1 })).length, 1, 'last move of player color, blue');

        assert.strictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', children: [{ move: 'b3' }, { move: 'b4' }] }] },
        })).length, 1, 'computer has two answers');

        assert.strictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', children: [{ move: 'c3' }] }] },
        })).length, 1, 'computer plays on player move');

        assert.strictEqual(validatePuzzle(createPuzzle({
            tree: { ...tree, move: 'a1' },
        })).length, 1, 'root with move');

        assert.strictEqual(validatePuzzle(createPuzzle({ title: 'x'.repeat(65) })).length, 1, 'title too long');
        assert.strictEqual(validatePuzzle(createPuzzle({ tree: { ...tree, message: 'x'.repeat(513) } })).length, 1, 'message too long');

        assert.strictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', result: 'solved', children: [{ move: 'b3', result: 'failed' }] }] },
        })).length, 1, 'result in continuation');

        assert.strictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', unknown: true } as PuzzleNode] },
        })).length, 1, 'unexpected property');
    });

    it('rejects invalid types', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ title: 42 as unknown as string })), [{ code: 'invalid_type', params: { property: 'title' } }]);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', message: 42 as unknown as string }] },
        })), [{ code: 'invalid_type', path: ['c3'], params: { property: 'message' } }]);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ lastMove: 'zz99' })), [{ code: 'outside_board', params: { move: 'zz99' } }]);
    });

    it('allows incomplete drafts, but not invalid data', () => {
        const draftErrors = (overrides: Partial<PuzzleDefinition>) => validatePuzzle(createPuzzle(overrides)).filter(isDraftBlockingError);

        assert.deepStrictEqual(draftErrors({ redStones: [], blueStones: [], tree: {} }), []);
        assert.deepStrictEqual(draftErrors({ tree: { children: [{ move: 'c3', result: 'failed' }] } }), []);
        assert.deepStrictEqual(draftErrors({ lastMove: 'a1' }), []);
        assert.strictEqual(draftErrors({ title: 'x'.repeat(65) }).length, 1);
        assert.strictEqual(draftErrors({ tree: { children: [{ move: 'z9' }] } }).length, 1);
    });

    it('normalizes texts', () => {
        assert.strictEqual(normalizePuzzleText('  Title '), 'Title');
        assert.strictEqual(normalizePuzzleText('   '), null);
        assert.strictEqual(normalizePuzzleText(undefined), null);
        assert.strictEqual(normalizePuzzleText(null), null);
    });

    it('rejects empty puzzles', () => {
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ redStones: [], blueStones: [] })), [{ code: 'empty_position' }]);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: {} })), [{ code: 'empty_tree' }]);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { message: 'Red to play', children: [] } })), [{ code: 'empty_tree' }]);
    });

    it('rejects puzzles without solution', () => {
        const errors = [{ code: 'no_solution' }];

        assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [{ move: 'c3', result: 'failed' }] } })), errors);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [{ else: 'c3' }] } })), errors);
        assert.deepStrictEqual(validatePuzzle(createPuzzle({
            tree: { children: [{ move: 'c3', children: [{ move: 'b3', result: 'failed' }] }] },
        })), errors, 'computer refutes only player move');
    });

    it('formats errors', () => {
        assert.strictEqual(puzzleErrorToString({ code: 'empty_tree' }), 'empty_tree');
        assert.strictEqual(puzzleErrorToString({ code: 'occupied', path: ['c3'], params: { move: 'c3' } }), 'occupied after "c3" {"move":"c3"}');
        assert.strictEqual(puzzleErrorToString({ code: 'node_not_object', path: [] }), 'node_not_object after "root"');
    });

    it('rejects invalid else nodes', () => {
        const rejects = (tree: PuzzleNode, message: string): void => {
            assert.strictEqual(validatePuzzle(createPuzzle({ tree })).length, 1, message);
        };

        rejects({ children: [{ else: 'c3' }, { move: 'b3' }] }, 'else not last');
        rejects({ children: [{ move: 'b3' }, { else: 'c3' }, { else: 'c4' }] }, 'two else');
        rejects({ children: [{ move: 'b3', children: [{ else: 'c3' }] }] }, 'else as computer answer');
        rejects({ children: [{ else: 'a5' }] }, 'else on occupied cell');
        rejects({ children: [{ else: 'c3', result: 'solved' } as unknown as PuzzleNode] }, 'solved else');
        rejects({ children: [{ else: 'c3', children: [] } as unknown as PuzzleNode] }, 'else with children');
        rejects({ children: [{ move: 'c3', result: 'solved', children: [{ move: 'b3', children: [{ else: 'b4' }] }] }] }, 'else in continuation');
    });

    it('limits nodes count', () => {
        const tree: PuzzleNode = { children: [] };
        let node = tree;

        // Long line of 513 nodes on a big board
        for (let i = 0; i < 513; ++i) {
            const child: PuzzleNode = { move: `${String.fromCharCode(97 + (i % 25))}${Math.floor(i / 25) + 1}` as PuzzleNode['move'], children: [] };
            node.children!.push(child);
            node = child;
        }

        const errors = validatePuzzle(createPuzzle({ boardsize: 25, redStones: ['y25'], blueStones: [], tree }));

        assert.deepStrictEqual(errors, [{ code: 'too_many_nodes', params: { max: 512 } }]);
    });

    describe('transpositions', () => {
        it('computes same key whatever moves order, by color', () => {
            assert.strictEqual(getPositionKey(['b4', 'b3', 'c3']), getPositionKey(['c3', 'b3', 'b4']));
            assert.notStrictEqual(getPositionKey(['b4', 'b3', 'c3']), getPositionKey(['b3', 'b4', 'c3']));
        });

        it('finds transposition leaves', () => {
            // c3 b3 b4 is continued, b4 b3 c3 reaches same position and continues from there
            const target: PuzzleNode = { move: 'b4', children: [{ move: 'd4' }] };
            const transposed: PuzzleNode = { move: 'c3' };
            const c3: PuzzleNode = { move: 'c3', children: [{ move: 'b3', children: [target] }] };
            const tree: PuzzleNode = { children: [
                c3,
                { move: 'b4', children: [{ move: 'b3', children: [transposed] }] },
                { move: 'd2', children: [{ move: 'b3', children: [{ move: 'c3' }] }] },
            ] };

            assert.deepStrictEqual([...findTranspositions(tree).entries()], [[transposed, { target, path: [c3, c3.children![0], target], moves: ['c3', 'b3', 'b4'] }]]);
        });

        it('ignores leaves with result, leaf to leaf, and different ended state', () => {
            const ignored = (tree: PuzzleNode, message: string): void => {
                assert.strictEqual(findTranspositions(tree).size, 0, message);
            };

            ignored({ children: [
                { move: 'a1', children: [{ move: 'b2', children: [{ move: 'c3', children: [{ move: 'd4' }] }] }] },
                { move: 'c3', children: [{ move: 'b2', children: [{ move: 'a1', result: 'failed' }] }] },
            ] }, 'leaf with result');

            ignored({ children: [
                { move: 'a1', children: [{ move: 'b2', children: [{ move: 'c3' }] }] },
                { move: 'c3', children: [{ move: 'b2', children: [{ move: 'a1' }] }] },
            ] }, 'leaf to leaf');

            ignored({ children: [
                { move: 'a1', children: [{ move: 'b2', children: [{ move: 'c3', children: [{ move: 'd4' }] }] }] },
                { move: 'c3', result: 'solved', children: [{ move: 'b2', children: [{ move: 'a1' }] }] },
            ] }, 'transposition in continuation');
        });

        it('finds same position node', () => {
            const leaf: PuzzleNode = { move: 'a1' };
            const other: PuzzleNode = { move: 'c3' };
            const tree: PuzzleNode = { children: [
                { move: 'c3', children: [{ move: 'b2', children: [leaf] }] },
                { move: 'a1', children: [{ move: 'b2', children: [other] }] },
            ] };

            const leafPath = [tree.children![0], (tree.children![0] as PuzzleNode).children![0], leaf];

            assert.deepStrictEqual(findSamePositionNode(tree, other)?.path, leafPath, 'first one when none is continued');
            assert.strictEqual(findSamePositionNode(tree, leaf), null, 'first one can be continued');
            assert.strictEqual(findSamePositionNode(tree, tree.children![0] as PuzzleNode), null, 'single position');

            other.children = [{ move: 'd4' }];

            assert.deepStrictEqual(findSamePositionNode(tree, leaf)?.moves, ['a1', 'b2', 'c3'], 'continued one');
            assert.strictEqual(findSamePositionNode(tree, other), null);
        });

        it('follows transpositions to find solution', () => {
            const tree: PuzzleNode = { children: [
                { move: 'a1', children: [{ move: 'b2', children: [{ move: 'c3', children: [{ move: 'd4', children: [{ move: 'b4' }] }] }] }] },
                { move: 'c3', children: [{ move: 'b2', children: [{ move: 'a1' }] }] },
            ] };
            const resolve = createNodeResolver(tree);
            const transposedLeaf = ((tree.children![1] as PuzzleNode).children![0] as PuzzleNode).children![0] as PuzzleNode;

            assert.strictEqual(getNodeResult(resolve(transposedLeaf)), null);
            assert.deepStrictEqual(findSolution(transposedLeaf, resolve, true)?.map(node => node.move), ['d4', 'b4']);
            assert.deepStrictEqual(findSolution(transposedLeaf, noTransposition, true), [], 'leaf when not following transpositions');
        });

        it('validates puzzle with transpositions', () => {
            assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [
                { move: 'c3', children: [{ move: 'b3', children: [{ move: 'b4', children: [{ move: 'd4', children: [{ move: 'd3' }] }] }] }] },
                { move: 'b4', children: [{ move: 'b3', children: [{ move: 'c3' }] }] },
            ] } })), []);

            assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [
                { move: 'c3', children: [{ move: 'b3', children: [{ move: 'b4', result: 'failed' }] }] },
                { move: 'b4', children: [{ move: 'b3', children: [{ move: 'c3' }] }] },
            ] } })), [{ code: 'no_solution' }], 'transposed to a failure');

            assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [
                { move: 'c3', children: [{ move: 'b3', children: [{ move: 'b4', children: [{ move: 'd4', result: 'failed' }] }] }] },
                { move: 'b4', children: [{ move: 'b3', children: [{ move: 'c3' }] }] },
            ] } })), [{ code: 'no_solution' }], 'transposed to a refuted move');
        });

        it('rejects two continued nodes with same position', () => {
            assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree: { children: [
                { move: 'c3', children: [{ move: 'b3', children: [{ move: 'b4', result: 'solved' }] }] },
                { move: 'b4', children: [{ move: 'b3', children: [{ move: 'c3', result: 'solved' }] }] },
            ] } })), [{ code: 'duplicate_position', path: ['b4', 'b3', 'c3'], params: { other: 'c3 b3 b4' } }]);

            assert.ok(!isDraftBlockingError({ code: 'duplicate_position' }));
        });
    });
});
