import assert from 'assert';
import { describe, it } from 'mocha';
import { createNodeResolver, createParallelsFinder, findChild, findElseNode, findErrorNode, findSamePositionNode, findSolution, findTranspositions, getComputerAnswer, getNodeResult, getParallelNodeResult, getPositionKey, isDraftBlockingError, isParallelRoot, normalizePuzzleText, puzzleErrorToString, validatePuzzle, type NodeResolver, type PuzzleDefinition, type PuzzleNode } from '../puzzles/puzzleTree.js';

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
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['b3'] })), [{ code: 'occupied', path: ['c3'], child: 0, params: { move: 'b3' } }], 'tree move');
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ disabledCells: ['d4'] })), [{ code: 'occupied', path: [], child: 2, params: { move: 'd4' } }], 'else answer');
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
        })), [{ code: 'occupied', path: ['c3'], child: 0, params: { move: 'c3' } }], 'error with path');
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
        assert.deepStrictEqual(validatePuzzle(createPuzzle({ redStones: [], blueStones: [] })), [{ code: 'empty_position', path: [] }]);
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

    it('finds error node', () => {
        const parallelTree: PuzzleNode = {
            children: [{ move: 'c3', children: [{ move: 'b3' }] }],
            parallel: [{ children: [{ move: 'a1', children: [{ move: 'a2' }] }] }],
        };

        assert.strictEqual(findErrorNode(tree, { code: 'invalid_player_color' }), null, 'not in tree');
        assert.strictEqual(findErrorNode(tree, { code: 'no_solution', path: [] }), tree, 'root');
        assert.strictEqual(findErrorNode(tree, { code: 'occupied', path: ['c3'], child: 0 }), findChild(tree, 'c3')!.children![0], 'child move');
        assert.strictEqual(findErrorNode(tree, { code: 'occupied', path: [], child: 2 }), findElseNode(tree), 'else node');
        assert.strictEqual(findErrorNode(tree, { code: 'occupied', path: ['e5'] }), null, 'not found');
        assert.strictEqual(findErrorNode(parallelTree, { code: 'empty_parallel', path: [], parallel: { index: 0, path: [] } }), parallelTree.parallel![0], 'parallel root');
        assert.strictEqual(findErrorNode(parallelTree, { code: 'occupied', path: [], parallel: { index: 0, path: ['a1'] }, child: 0 }), findChild(parallelTree.parallel![0], 'a1')!.children![0], 'in parallel');

        // Every error of a validated puzzle is found back in tree
        const invalidTree: PuzzleNode = { children: [{ move: 'c3', children: [{ move: 'a5' }, { move: 'b3' }] }, { else: 'b5' }] };

        for (const error of validatePuzzle(createPuzzle({ tree: invalidTree }))) {
            assert.notStrictEqual(findErrorNode(invalidTree, error), null, error.code);
        }
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

    describe('parallel sequences', () => {
        // Main sequence c3 b3 b4 d2, x: a1 then computer answers a2, available at any time
        const exchange = (): PuzzleNode => ({ children: [{ move: 'a1', children: [{ move: 'a2' }] }] });
        const mainSequence = (): PuzzleNode[] => [{ move: 'c3', children: [{ move: 'b3', children: [{ move: 'b4', children: [{ move: 'd2' }] }] }] }];

        const errorCodes = (tree: PuzzleNode): string[] => validatePuzzle(createPuzzle({ tree })).map(({ code }) => code);

        it('finds parallel sequences available from a node', () => {
            const rootParallel = exchange();
            const nestedParallel: PuzzleNode = { children: [{ move: 'e3', children: [{ move: 'e4' }] }] };
            const b3: PuzzleNode = { move: 'b3', parallel: [nestedParallel], children: [{ move: 'b4' }] };
            const c3: PuzzleNode = { move: 'c3', children: [b3] };
            const d2: PuzzleNode = { move: 'd2' };
            const tree: PuzzleNode = { parallel: [rootParallel], children: [c3, d2] };
            const findParallels = createParallelsFinder(tree);

            assert.deepStrictEqual(findParallels(tree), [rootParallel]);
            assert.deepStrictEqual(findParallels(c3), [rootParallel]);
            assert.deepStrictEqual(findParallels(d2), [rootParallel], 'sibling branch');
            assert.deepStrictEqual(findParallels(b3), [rootParallel, nestedParallel]);
            assert.deepStrictEqual(findParallels(b3.children![0] as PuzzleNode), [rootParallel, nestedParallel], 'inherited in subtree');
            assert.deepStrictEqual(findParallels(rootParallel), [], 'not a main sequence node');
        });

        it('fails but never solves the puzzle', () => {
            assert.strictEqual(getParallelNodeResult({ move: 'a2' }), null);
            assert.strictEqual(getParallelNodeResult({ move: 'a1', result: 'failed' }), 'failed');
            assert.strictEqual(getParallelNodeResult({ move: 'a1', result: 'solved' }), null);
        });

        it('identifies parallel sequence root', () => {
            assert.ok(isParallelRoot(exchange()));
            assert.ok(!isParallelRoot({ move: 'a1' }));
            assert.ok(!isParallelRoot({ else: 'a1' }));
        });

        it('validates puzzle with parallel sequences', () => {
            assert.deepStrictEqual(errorCodes({ parallel: [exchange()], children: mainSequence() }), [], 'on root');

            const tree: PuzzleNode = { children: mainSequence() };
            const b3 = ((tree.children![0] as PuzzleNode).children![0] as PuzzleNode);

            b3.parallel = [exchange(), { children: [{ move: 'e3', result: 'failed' }] }];

            assert.deepStrictEqual(errorCodes(tree), [], 'after computer move, with failing move');
        });

        it('ignores parallel sequences to find solution', () => {
            const tree: PuzzleNode = { parallel: [exchange()], children: mainSequence() };

            assert.deepStrictEqual(findSolution(tree, noTransposition)?.map(node => node.move), ['c3', 'b3', 'b4', 'd2']);
        });

        it('rejects invalid parallel sequences', () => {
            const c3 = (parallel: unknown): PuzzleNode[] => [{ move: 'c3', parallel: parallel as PuzzleNode[], children: [{ move: 'b3' }] }];

            assert.deepStrictEqual(errorCodes({ parallel: 'a1' as never, children: mainSequence() }), ['parallel_not_list']);
            assert.ok(isDraftBlockingError({ code: 'parallel_not_list' }));
            assert.deepStrictEqual(errorCodes({ children: c3([exchange()]) }), ['parallel_on_computer_move']);
            assert.deepStrictEqual(errorCodes({ children: [{ move: 'c3', result: 'solved', children: [{ move: 'b3', parallel: [exchange()] }] }] }), ['parallel_in_continuation']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ children: [{ move: 'a1', children: [{ move: 'a2', parallel: [{ children: [{ move: 'e3', children: [{ move: 'e4' }] }] }] }] }] }], children: mainSequence() }), ['parallel_nested']);
            assert.deepStrictEqual(errorCodes({ parallel: [{}], children: mainSequence() }), ['empty_parallel']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ children: [] }], children: mainSequence() }), ['empty_parallel']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ children: [{ move: 'a1', children: [{ move: 'a2' }] }, { else: 'a3' }] }], children: mainSequence() }), ['else_in_parallel']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ children: [{ move: 'a1', children: [{ move: 'a2', children: [{ move: 'a3', result: 'solved' }] }] }] }], children: mainSequence() }), ['solved_in_parallel']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ children: [{ move: 'a1' }] }], children: mainSequence() }), ['parallel_missing_answer']);
            assert.deepStrictEqual(errorCodes({ parallel: [{ message: 'x', children: [{ move: 'a1', children: [{ move: 'a2' }] }] }], children: mainSequence() }), ['unexpected_property']);
            assert.deepStrictEqual(errorCodes({ parallel: ['a1' as never], children: mainSequence() }), ['node_not_object']);
        });

        it('locates errors in parallel sequences', () => {
            const tree: PuzzleNode = { children: mainSequence() };
            const b3 = ((tree.children![0] as PuzzleNode).children![0] as PuzzleNode);

            b3.parallel = [exchange(), { children: [{ move: 'e3', children: [{ move: 'e4', children: [{ move: 'e5' }] }] }] }];

            const errors = validatePuzzle(createPuzzle({ tree }));

            assert.deepStrictEqual(errors, [{ code: 'parallel_missing_answer', path: ['c3', 'b3'], parallel: { index: 1, path: ['e3', 'e4', 'e5'] } }]);
            assert.strictEqual(puzzleErrorToString(errors[0]), 'parallel_missing_answer after "c3 b3" in parallel 2 after "e3 e4 e5"');
        });

        it('rejects parallel sequences on a leaf, never played', () => {
            // b3 solves the puzzle before its parallel sequence can be played
            assert.deepStrictEqual(errorCodes({ children: [{ move: 'c3', children: [{ move: 'b3', parallel: [exchange()] }] }] }), ['parallel_on_leaf']);
            assert.ok(!isDraftBlockingError({ code: 'parallel_on_leaf' }));

            // b3 transposes to continued position, and would drop its parallel sequence
            const transposition: PuzzleNode = {
                children: [
                    { move: 'c3', children: [{ move: 'b3', children: [{ move: 'd2', children: [{ move: 'b4', children: [{ move: 'd3' }] }] }] }] },
                    { move: 'd2', children: [{ move: 'b4', children: [{ move: 'c3', children: [{ move: 'b3', parallel: [exchange()] }] }] }] },
                ],
            };

            assert.deepStrictEqual(errorCodes(transposition), ['parallel_on_leaf']);
        });

        it('rejects parallel sequences sharing cells', () => {
            const overlap = (tree: PuzzleNode, move: string, message: string, index = 0): void => {
                assert.deepStrictEqual(validatePuzzle(createPuzzle({ tree })), [{ code: 'parallel_overlap', path: [], parallel: { index, path: [] }, params: { move } }], message);
            };

            overlap({ parallel: [{ children: [{ move: 'b4', children: [{ move: 'a2' }] }] }], children: mainSequence() }, 'b4', 'main sequence move');
            overlap({ parallel: [exchange()], children: [...mainSequence(), { else: 'a2' }] }, 'a2', 'main else answer');
            overlap({ parallel: [exchange(), { children: [{ move: 'a3', children: [{ move: 'a1' }] }] }], children: mainSequence() }, 'a1', 'other parallel sequence', 1);
            overlap({ parallel: [exchange()], children: [{ move: 'c3', children: [{ move: 'b3', parallel: [{ children: [{ move: 'e3', children: [{ move: 'a2' }] }] }], children: [{ move: 'b4' }] }] }] }, 'a2', 'parallel sequence nested in main sequence');
        });

        it('rejects transposition to a node having other parallel sequences', () => {
            // c3 b3 d2 b4 is continued, d2 b4 c3 b3 transposes to it
            const tree = (parallelOnD2: boolean): PuzzleNode => ({
                parallel: [exchange()],
                children: [
                    { move: 'c3', children: [{ move: 'b3', children: [{ move: 'd2', children: [{ move: 'b4', children: [{ move: 'd3' }] }] }] }] },
                    { move: 'd2', children: [{ move: 'b4', parallel: parallelOnD2 ? [{ children: [{ move: 'e3', children: [{ move: 'e4' }] }] }] : undefined, children: [{ move: 'c3', children: [{ move: 'b3' }] }] }] },
                ],
            });

            assert.deepStrictEqual(errorCodes(tree(false)), [], 'same parallel sequences, declared on common ancestor');
            assert.deepStrictEqual(
                validatePuzzle(createPuzzle({ tree: tree(true) })),
                [{ code: 'parallel_transposition', path: ['d2', 'b4', 'c3', 'b3'], params: { other: 'c3 b3 d2 b4' } }],
            );
        });
    });
});
