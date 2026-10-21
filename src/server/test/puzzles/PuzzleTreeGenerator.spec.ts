import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, type Move } from '@playhex/move-notation';
import { generatePuzzleTree, type PolicyAnalyzer } from '../../puzzles/PuzzleTreeGenerator.js';
import type { SolvePositionInput, SolvePositionOutput, SolveResult } from '../../ai-jobs/protocol.js';
import { createNodeResolver, findSolution, isElseNode, validatePuzzle, type PuzzleDefinition, type PuzzleNode } from '../../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleGenerateInput } from '../../../shared/app/puzzles/puzzleGenerate.js';
import { getWinner } from '../../puzzles/puzzleCheckUtils.js';
import { findTemplateInstances } from '../../../shared/hex-templates/template-connection.js';

/**
 * Exact solver for tiny boards, by trying all moves.
 * Winner plays its first winning move, loser its first move.
 */
const createExactSolver = () => {
    const memo = new Map<string, SolveResult>();
    const calls: SolvePositionInput[] = [];

    const solveExact = (size: number, black: Move[], white: Move[], color: 'black' | 'white'): SolveResult => {
        const key = [size, color, [...black].sort().join(','), [...white].sort().join(',')].join('|');
        const cached = memo.get(key);

        if (cached !== undefined) {
            return cached;
        }

        const other = color === 'black' ? 'white' : 'black';
        const winner = getWinner(size, { red: black, blue: white, toMove: 0 });

        let result: SolveResult;

        if (winner !== null) {
            result = { winner: winner === 0 ? 'black' : 'white', pv: [] };
        } else {
            const occupied = new Set([...black, ...white]);
            let losing: null | SolveResult = null;
            let losingMove: null | Move = null;
            let winning: null | Move = null;
            let winningResult: null | SolveResult = null;

            for (let row = 0; row < size && winning === null; ++row) {
                for (let col = 0; col < size && winning === null; ++col) {
                    const move = coordsToMove({ row, col });

                    if (occupied.has(move)) {
                        continue;
                    }

                    const child = color === 'black'
                        ? solveExact(size, [...black, move], white, other)
                        : solveExact(size, black, [...white, move], other);

                    if (child.winner === color) {
                        winning = move;
                        winningResult = child;
                    } else if (losing === null) {
                        losing = child;
                        losingMove = move;
                    }
                }
            }

            result = winning !== null
                ? { winner: color, pv: [winning, ...winningResult!.pv] }
                : { winner: other, pv: [losingMove!, ...losing!.pv] }
            ;
        }

        memo.set(key, result);

        return result;
    };

    const solve = (input: SolvePositionInput): Promise<SolvePositionOutput> => {
        calls.push(input);

        const { size, black, white, color } = input;
        const output: SolvePositionOutput = solveExact(size, black, white, color);

        if (input.children) {
            output.children = {};
            const occupied = new Set([...black, ...white]);

            for (let row = 0; row < size; ++row) {
                for (let col = 0; col < size; ++col) {
                    const move = coordsToMove({ row, col });

                    if (!occupied.has(move)) {
                        output.children[move] = color === 'black'
                            ? solveExact(size, [...black, move], white, 'white')
                            : solveExact(size, black, [...white, move], 'black');
                    }
                }
            }
        }

        return Promise.resolve(output);
    };

    return { solve, calls };
};

/**
 * Policy preferring given moves, in this order, then uniform.
 */
const createAnalyzer = (preferred: Move[]): PolicyAnalyzer => input => Promise.resolve({
    policy: Array(input.size).fill(0).map((_, row) => Array(input.size).fill(0).map((__, col) => {
        const index = preferred.indexOf(coordsToMove({ row, col }));

        return index === -1 ? 0.01 : 1 - index * 0.05;
    })),
});

const createInput = (puzzle: Partial<PuzzleDefinition>, options: Partial<PuzzleGenerateInput> = {}): PuzzleGenerateInput => ({
    puzzle: {
        boardsize: 3,
        redStones: [],
        blueStones: [],
        playerColor: 0,
        tree: {},
        ...puzzle,
    },
    fromPath: [],
    templateIds: [],
    refutationLength: 1,
    ...options,
});

const allCells = (size: number): Move[] => Array(size * size).fill(0).map((_, i) => coordsToMove({ row: Math.floor(i / size), col: i % size }));

const generate = async (input: PuzzleGenerateInput, analyze: null | PolicyAnalyzer = null) => {
    const { solve } = createExactSolver();
    const output = await generatePuzzleTree(input, { solve, analyze });
    const tree: PuzzleNode = { ...input.puzzle.tree, ...output.subtree };
    const puzzle: PuzzleDefinition = { ...input.puzzle, tree };

    return { ...output, tree, puzzle };
};

const mainMoves = (node: PuzzleNode): Move[] => (node.children ?? []).flatMap(child => isElseNode(child) ? [] : [child.move!]);

describe('PuzzleTreeGenerator', () => {
    it('generates a valid tree until connection is complete', async () => {
        const { tree, puzzle, warnings } = await generate(createInput({ redStones: ['a1'], blueStones: ['c3'] }));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.ok(findSolution(tree, createNodeResolver(tree)));

        // Leaves of main sequence are completed connections, or transpositions
        const resolve = createNodeResolver(tree);
        const walk = (node: PuzzleNode, red: Move[], blue: Move[], redToMove: boolean): void => {
            if (node.result !== undefined) {
                return;
            }

            const children = (node.children ?? []).filter(child => !isElseNode(child)) as PuzzleNode[];

            if (children.length === 0 && resolve(node) === node) {
                assert.strictEqual(getWinner(3, { red, blue, toMove: 0 }), 0, `not connected: ${red.join(' ')} / ${blue.join(' ')}`);
            }

            for (const child of children) {
                walk(child, redToMove ? [...red, child.move!] : red, redToMove ? blue : [...blue, child.move!], !redToMove);
            }
        };

        walk(tree, ['a1'], ['c3'], true);
    });

    it('stops once connected with acquired templates', async () => {
        const input = createInput({ blueStones: ['c3'] }, { templateIds: ['bridge'] });
        const { tree, puzzle } = await generate(input);

        assert.deepStrictEqual(validatePuzzle(puzzle), []);

        // b2 bridges to both edges
        const b2 = tree.children!.find(child => !isElseNode(child) && child.move === 'b2') as PuzzleNode;

        assert.ok(b2);
        assert.strictEqual(b2.children, undefined);
    });

    it('fails plausible losing moves with a refutation', async () => {
        // A losing move preferred by katahex
        const input = createInput({ blueStones: ['c3'] });
        const { solve } = createExactSolver();
        const firstChildren = (await solve({ size: 3, black: [], white: ['c3'], color: 'black', timeLimitSeconds: 1, children: { maxTimeSeconds: 1 } })).children!;
        const losingMove = (Object.keys(firstChildren) as Move[]).find(move => firstChildren[move].winner === 'white')!;
        const winningMoves = (Object.keys(firstChildren) as Move[]).filter(move => firstChildren[move].winner === 'black');

        assert.ok(losingMove && winningMoves.length > 0, 'test position must have both winning and losing moves');

        for (const refutationLength of [1, 2] as const) {
            const { tree, puzzle } = await generate({ ...input, refutationLength }, createAnalyzer([losingMove]));
            const failed = tree.children!.find(child => !isElseNode(child) && child.move === losingMove) as PuzzleNode;

            assert.deepStrictEqual(validatePuzzle(puzzle), []);
            assert.strictEqual(failed.result, 'failed');

            let length = 0;

            for (let node: undefined | PuzzleNode = failed; node?.children?.length; node = node.children[0] as PuzzleNode) {
                ++length;
            }

            assert.strictEqual(length, Math.min(2 * refutationLength - 1, firstChildren[losingMove].pv.length));
        }
    });

    it('answers other losing moves with an else node', async () => {
        const { tree } = await generate(createInput({ blueStones: ['c3'] }));
        const last = tree.children![tree.children!.length - 1];

        assert.ok(isElseNode(last));
    });

    it('makes parallel sequences of opponent bridge intrusions', async () => {
        // Red b1 b2 b3 wins with a4 or b4. Blue d1 - c3 bridge, carrier c2 d2.
        const disabledCells: Move[] = ['a1', 'c1', 'a2', 'a3', 'd3', 'c4', 'd4'];
        const { tree, puzzle, warnings } = await generate(createInput({
            boardsize: 4,
            redStones: ['b1', 'b2', 'b3'],
            blueStones: ['d1', 'c3'],
            disabledCells,
        }));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.deepStrictEqual(mainMoves(tree).sort(), ['a4', 'b4']);
        assert.strictEqual(tree.parallel?.length, 1);
        assert.deepStrictEqual(
            [...tree.parallel[0].children!].sort((a, b) => (a as PuzzleNode).move!.localeCompare((b as PuzzleNode).move!)),
            [
                { move: 'c2', children: [{ move: 'd2' }] },
                { move: 'd2', children: [{ move: 'c2' }] },
            ],
        );
    });

    it('generates computer answers first when computer plays first', async () => {
        const input = createInput({ redStones: ['b2'], computerPlaysFirst: true });
        const { tree, puzzle, warnings } = await generate(input, createAnalyzer(['a3']));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.strictEqual(mainMoves(tree).length, 1);
    });

    it('answers with the move leaving the fewest winning moves to player', async function () {
        // Exact solver on 4x4
        this.timeout(30_000);

        // Red b2 c2 on 4x4 wins whatever blue plays: katahex prefers blue moves in this order
        const preferred: Move[] = ['a1', 'b4', 'b3', 'c3'];
        const input = createInput({ boardsize: 4, redStones: ['b2', 'c2'], blueStones: ['d4'], computerPlaysFirst: true }, { templateIds: ['bridge'] });
        const { solve } = createExactSolver();

        const winningAnswers = await Promise.all(preferred.map(async move => {
            const { children } = await solve({ size: 4, black: ['b2', 'c2'], white: ['d4', move], color: 'black', timeLimitSeconds: 1, children: { maxTimeSeconds: 1 } });

            // Intrusions in blue bridges are parallel sequences, not counted, unless there is nothing else to play
            const intrusions = new Set(findTemplateInstances({ boardsize: 4, own: ['d4', move], opponent: ['b2', 'c2'], color: 1, templateIds: ['bridge'] }).flatMap(({ carrier }) => carrier));
            const winning = (Object.entries(children!) as [Move, SolveResult][]).filter(([, { winner }]) => winner === 'black').map(([cell]) => cell);
            const answers = winning.filter(cell => !intrusions.has(cell)).length;

            return answers > 0 ? answers : winning.length;
        }));

        const hardest = preferred[winningAnswers.indexOf(Math.min(...winningAnswers))];

        assert.notStrictEqual(hardest, preferred[0], 'test position must have a harder move than katahex best move');

        const { tree } = await generate(input, createAnalyzer(preferred));

        assert.deepStrictEqual(mainMoves(tree), [hardest]);
    });

    it('generates from a node, keeping the rest of tree', async () => {
        const tree: PuzzleNode = {
            children: [
                { move: 'b2', children: [{ move: 'a3' }] },
                { move: 'a1', result: 'failed' },
            ],
        };

        const { solve } = createExactSolver();
        const output = await generatePuzzleTree(createInput({ tree, boardsize: 4, redStones: ['d1'], blueStones: ['a4'] }, { fromPath: ['b2', 'a3'] }), { solve, analyze: null });

        assert.ok((output.subtree.children?.length ?? 0) > 0);

        // Input tree is not modified
        assert.strictEqual((tree.children![0] as PuzzleNode).children![0].hasOwnProperty('children'), false);
    });

    it('rejects a path not in tree', async () => {
        const { solve } = createExactSolver();

        await assert.rejects(generatePuzzleTree(createInput({}, { fromPath: ['a1'] }), { solve, analyze: null }));
    });

    it('warns when already connected', async () => {
        const { warnings, tree } = await generate(createInput({ redStones: ['b1', 'b2', 'b3'] }));

        assert.deepStrictEqual(warnings.map(w => w.code), ['generator_already_connected']);
        assert.strictEqual(tree.children, undefined);
    });

    it('warns when player cannot win', async () => {
        // Blue b2 connects with a2, and with c1 or c2
        const { warnings } = await generate(createInput({ blueStones: ['a2', 'b2'] }));

        assert.deepStrictEqual(warnings.map(w => w.code), ['generator_initial_not_winning']);
    });

    it('warns on unproven positions', async () => {
        const solve = (input: SolvePositionInput): Promise<SolvePositionOutput> => Promise.resolve({
            winner: null,
            pv: [],
            ...(input.children ? { children: Object.fromEntries(allCells(input.size).map(move => [move, { winner: null, pv: [] }])) } : {}),
        });

        const output = await generatePuzzleTree(createInput({ redStones: ['a1'] }), { solve, analyze: null });

        assert.deepStrictEqual(output.warnings.map(w => w.code), ['generator_unproven']);
    });

    it('keeps disabled cells unplayed', async () => {
        const disabledCells: Move[] = ['a3'];
        const { puzzle } = await generate(createInput({ disabledCells, redStones: ['b1'] }));

        assert.deepStrictEqual(validatePuzzle(puzzle), []);

        const cells = new Set<string>();
        const walk = (node: PuzzleNode): void => [...node.children ?? [], ...node.parallel ?? []].forEach(child => {
            cells.add(isElseNode(child) ? child.else : child.move ?? '');

            if (!isElseNode(child)) {
                walk(child);
            }
        });

        walk(puzzle.tree);

        assert.ok(cells.size > 1);
        assert.ok(disabledCells.every(cell => !cells.has(cell)));
    });

    it('uses stones connected to edge through disabled cells', async () => {
        // Top row is outside the puzzle, b2 is connected to it
        const puzzle: Partial<PuzzleDefinition> = { boardsize: 4, redStones: ['b2'], disabledCells: ['a1', 'b1', 'c1', 'd1'] };

        const without = await generate(createInput(puzzle));

        assert.deepStrictEqual(without.warnings.map(w => w.code), ['generator_depends_on_disabled_cells']);

        const { tree, warnings, puzzle: generated } = await generate(createInput({ ...puzzle, edgeConnections: [{ move: 'b2', edge: 0 }] }, { templateIds: ['bridge'] }));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(generated), []);
        assert.ok(findSolution(tree, createNodeResolver(tree)));

        // b3 bridges to bottom, and is connected to top through b2
        const b3 = tree.children!.find(child => !isElseNode(child) && child.move === 'b3') as PuzzleNode;

        assert.ok(b3);
        assert.strictEqual(b3.children, undefined);
    });

    it('finds refutations when solver gives no proof line', async () => {
        const exact = createExactSolver();

        // Like Mohex when a position is solved without search
        const solve = async (input: SolvePositionInput): Promise<SolvePositionOutput> => {
            const output = await exact.solve(input);

            return {
                ...output,
                pv: [],
                ...(output.children ? { children: Object.fromEntries(Object.entries(output.children).map(([move, child]) => [move, { ...child, pv: [] }])) } : {}),
            };
        };

        const input = createInput({ blueStones: ['c3'] });
        const firstChildren = (await exact.solve({ size: 3, black: [], white: ['c3'], color: 'black', timeLimitSeconds: 1, children: { maxTimeSeconds: 1 } })).children!;
        const losingMove = (Object.keys(firstChildren) as Move[]).find(move => firstChildren[move].winner === 'white')!;

        for (const refutationLength of [1, 2] as const) {
            const output = await generatePuzzleTree({ ...input, refutationLength }, { solve, analyze: createAnalyzer([losingMove]) });
            const tree: PuzzleNode = output.subtree;
            const failed = tree.children!.find(child => !isElseNode(child) && child.move === losingMove) as PuzzleNode;

            assert.deepStrictEqual(validatePuzzle({ ...input.puzzle, tree }), []);
            assert.strictEqual(failed.result, 'failed');

            // Computer answer is proven winning
            const answer = failed.children![0] as PuzzleNode;

            assert.strictEqual(firstChildren[losingMove].winner, 'white');
            assert.strictEqual((await exact.solve({ size: 3, black: [losingMove], white: ['c3', answer.move!], color: 'black', timeLimitSeconds: 1 })).winner, 'white');

            if (refutationLength === 2) {
                assert.ok(answer.children?.length, 'player move after refutation');
            }

            assert.ok(isElseNode(tree.children![tree.children!.length - 1]));
        }
    });
});
