import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, type Move } from '@playhex/move-notation';
import { generatePuzzleTree, type PolicyAnalyzer } from '../../puzzles/PuzzleTreeGenerator.js';
import type { SolvePositionInput, SolvePositionOutput, SolveResult } from '../../ai-jobs/protocol.js';
import { createNodeResolver, createParallelsFinder, findSolution, isElseNode, validatePuzzle, type PuzzleDefinition, type PuzzleNode } from '../../../shared/app/puzzles/puzzleTree.js';
import { type PuzzleGenerateInput } from '../../../shared/app/puzzles/puzzleGenerate.js';
import { getWinner } from '../../puzzles/puzzleCheckUtils.js';

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

        // Leaves of main sequence are completed connections, transpositions, or winning moves not continued
        const resolve = createNodeResolver(tree);
        const { solve } = createExactSolver();
        const walk = async (node: PuzzleNode, red: Move[], blue: Move[], redToMove: boolean, depth: number): Promise<void> => {
            if (node.result !== undefined) {
                return;
            }

            const children = (node.children ?? []).filter(child => !isElseNode(child)) as PuzzleNode[];

            if (children.length === 0 && resolve(node) === node && getWinner(3, { red, blue, toMove: 0 }) !== 0) {
                const { winner } = await solve({ size: 3, black: red, white: blue, color: 'white' } as SolvePositionInput);

                assert.strictEqual(winner, 'black', `not winning: ${red.join(' ')} / ${blue.join(' ')}`);
            }

            // After fullDepth, only one winning move is continued
            if (redToMove && depth >= 1) {
                assert.ok(children.filter(child => child.result === undefined && (child.children?.length ?? 0) > 0).length <= 1);
            }

            for (const child of children) {
                await walk(child, redToMove ? [...red, child.move!] : red, redToMove ? blue : [...blue, child.move!], !redToMove, redToMove ? depth + 1 : depth);
            }
        };

        await walk(tree, ['a1'], ['c3'], true, 0);
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

        const { tree, puzzle } = await generate(input, createAnalyzer([losingMove]));
        const failed = tree.children!.find(child => !isElseNode(child) && child.move === losingMove) as PuzzleNode;

        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.strictEqual(failed.result, 'failed');

        // Single computer answer
        assert.strictEqual(failed.children?.length, 1);
        assert.strictEqual((failed.children[0] as PuzzleNode).children, undefined);
    });

    it('uses fixed cells as stones for connection', async () => {
        // b1 outside the puzzle is red: b2 connects to top through it, and to bottom with a bridge
        const input = createInput({ blueStones: ['c3'], disabledCells: ['a1', 'b1', 'c1'], fixedFill: [{ move: 'b1', color: 0 }] }, { templateIds: ['bridge'] });
        const { tree, puzzle } = await generate(input);
        const b2 = tree.children!.find(child => !isElseNode(child) && child.move === 'b2') as PuzzleNode;

        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.ok(b2);
        assert.strictEqual(b2.children, undefined);
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

        // Completing again keeps existing parallel sequence, without adding it twice
        const again = await generate(createInput({ ...puzzle, tree }));

        assert.deepStrictEqual(again.warnings, []);
        assert.deepStrictEqual(again.tree, tree);
        assert.deepStrictEqual(
            [...tree.parallel[0].children!].sort((a, b) => (a as PuzzleNode).move!.localeCompare((b as PuzzleNode).move!)),
            [
                { move: 'c2', children: [{ move: 'd2' }] },
                { move: 'd2', children: [{ move: 'c2' }] },
            ],
        );
    });

    it('plays bridge intrusions as main moves when main sequence uses their cells', async function () {
        // Exact solver on 4x4
        this.timeout(30_000);

        // Intrusion a2 found after b3 b2 is played later in main sequence.
        // Computer plays central cells first, else it plays weak moves and tree exceeds budget.
        const input = createInput({ boardsize: 4, blueStones: ['c1'] }, { templateIds: ['bridge'] });
        const { tree, puzzle, warnings } = await generate(input, createAnalyzer(['b2', 'c2', 'b3', 'c3', 'a3', 'd2', 'a2', 'd3', 'b1', 'c4', 'b4', 'a4', 'd1', 'a1', 'd4']));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);

        // Every winning move is accepted, in main sequence or in a parallel sequence
        const { solve } = createExactSolver();
        const findParallels = createParallelsFinder(tree);
        const walk = async (node: PuzzleNode, red: Move[], blue: Move[], redToMove: boolean): Promise<void> => {
            const children = (node.children ?? []).filter(child => !isElseNode(child)) as PuzzleNode[];

            if (redToMove && children.length > 0) {
                const output = await solve({ size: 4, black: red, white: blue, color: 'black', timeLimitSeconds: 1, children: { maxTimeSeconds: 1 } });
                const accepted = new Set([
                    ...children.filter(child => child.result === undefined).map(child => child.move!),
                    ...findParallels(node).flatMap(root => (root.children as PuzzleNode[]).map(child => child.move!)),
                ]);

                for (const [move, { winner }] of Object.entries(output.children!)) {
                    if (winner === 'black') {
                        assert.ok(accepted.has(move as Move), `winning ${move} not accepted after ${red.join(' ')} / ${blue.join(' ')}`);
                    }
                }
            }

            for (const child of children.filter(child => child.result === undefined)) {
                await walk(child, redToMove ? [...red, child.move!] : red, redToMove ? blue : [...blue, child.move!], !redToMove);
            }
        };

        await walk(tree, [], ['c1'], true);
    });

    it('generates computer answers first when computer plays first', async () => {
        const input = createInput({ redStones: ['b2'], computerPlaysFirst: true });
        const { tree, puzzle, warnings } = await generate(input, createAnalyzer(['a3']));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.strictEqual(mainMoves(tree).length, 1);
    });

    it('answers with katahex best move', async function () {
        // Exact solver on 4x4
        this.timeout(30_000);

        // Red b2 c2 on 4x4 wins whatever blue plays: katahex prefers blue moves in this order
        const preferred: Move[] = ['b4', 'a1', 'b3', 'c3'];
        const input = createInput({ boardsize: 4, redStones: ['b2', 'c2'], blueStones: ['d4'], computerPlaysFirst: true }, { templateIds: ['bridge'] });
        const { tree } = await generate(input, createAnalyzer(preferred));

        assert.deepStrictEqual(mainMoves(tree), ['b4']);
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

    it('completes an existing tree, keeping its moves', async () => {
        const position = { redStones: ['a1'] as Move[], blueStones: ['c3'] as Move[] };
        const full = await generate(createInput(position));
        const [removed, ...kept] = (full.tree.children ?? []).filter(child => !isElseNode(child) && child.result === undefined) as PuzzleNode[];

        assert.ok(removed);

        // Author removed a winning move, and replaced a computer answer
        const tree: PuzzleNode = structuredClone({ children: full.tree.children!.filter(child => child !== removed) });
        const replaced = tree.children!.find(child => !isElseNode(child) && kept.some(({ move }) => move === child.move) && child.children?.length) as PuzzleNode;

        assert.ok(replaced);

        const otherAnswer = allCells(3).find(move => ![...position.redStones, ...position.blueStones, replaced.move!, (replaced.children![0] as PuzzleNode).move!].includes(move))!;

        replaced.children = [{ move: otherAnswer }];

        const { tree: completed, puzzle, warnings } = await generate(createInput({ ...position, tree }));

        assert.deepStrictEqual(warnings, []);
        assert.deepStrictEqual(validatePuzzle(puzzle), []);
        assert.ok(mainMoves(completed).includes(removed.move!));

        const answer = (completed.children!.find(child => !isElseNode(child) && child.move === replaced.move) as PuzzleNode).children![0] as PuzzleNode;

        assert.strictEqual(answer.move, otherAnswer);
        assert.ok((answer.children?.length ?? 0) > 0, 'author answer is continued');
    });

    it('changes nothing when tree is complete', async () => {
        const position = { redStones: ['a1'] as Move[], blueStones: ['c3'] as Move[] };
        const full = await generate(createInput(position));
        const again = await generate(createInput({ ...position, tree: full.tree }));

        assert.deepStrictEqual(again.warnings, []);
        assert.deepStrictEqual(again.tree, full.tree);
    });

    it('warns on existing moves contradicting solver', async () => {
        // On 3x3 with red a1 and blue c3, b2 wins
        const tree: PuzzleNode = { children: [{ move: 'b2', result: 'failed' }] };
        const { warnings } = await generate(createInput({ redStones: ['a1'], blueStones: ['c3'], tree }));

        assert.ok(warnings.some(({ code, path }) => code === 'generator_failed_winning' && path?.join(' ') === 'b2'));
    });

    it('continues all winning moves within fullDepth', async () => {
        // Empty 3x3: red has several winning moves
        const { tree } = await generate(createInput({}, { fullDepth: 1 }), createAnalyzer(['b2']));
        const accepted = (tree.children ?? []).filter(child => !isElseNode(child) && child.result === undefined) as PuzzleNode[];

        assert.ok(accepted.length > 1);
        assert.ok(accepted.every(child => (child.children?.length ?? 0) > 0));
    });

    it('continues only most natural winning move after fullDepth', async () => {
        const { tree } = await generate(createInput({}, { fullDepth: 0 }), createAnalyzer(['b2']));
        const accepted = (tree.children ?? []).filter(child => !isElseNode(child) && child.result === undefined) as PuzzleNode[];
        const continued = accepted.filter(child => (child.children?.length ?? 0) > 0);

        assert.ok(accepted.length > 1);

        // b2 has best policy, others winning moves are leaves
        assert.deepStrictEqual(continued.map(child => child.move), ['b2']);
    });

    it('continues best winning move even if not plausible', async () => {
        // Katahex prefers a losing move: no winning move is plausible, but best one is still continued
        const { tree } = await generate(createInput({ redStones: ['a1'], blueStones: ['c3'] }, { fullDepth: 0 }), createAnalyzer(['c2']));
        const children = (tree.children ?? []).filter(child => !isElseNode(child)) as PuzzleNode[];
        const accepted = children.filter(child => child.result === undefined);

        assert.strictEqual(children.find(child => child.move === 'c2')?.result, 'failed');
        assert.ok(accepted.length > 1);
        assert.strictEqual(accepted.filter(child => (child.children?.length ?? 0) > 0).length, 1);
    });

    it('makes transpositions to the rest of tree', async function () {
        // Exact solver on 4x4
        this.timeout(30_000);

        const puzzle: Partial<PuzzleDefinition> = { boardsize: 4, redStones: ['b3', 'c2'], computerPlaysFirst: true };
        const { solve } = createExactSolver();
        const first = await generatePuzzleTree(createInput({ ...puzzle, tree: { children: [{ move: 'c1' }] } }, { fromPath: ['c1'], templateIds: ['bridge'] }), { solve, analyze: null });

        // Then generates from another computer first move
        const tree: PuzzleNode = { children: [{ move: 'c1', ...first.subtree }, { move: 'd1' }] };
        const second = await generatePuzzleTree(createInput({ ...puzzle, tree }, { fromPath: ['d1'], templateIds: ['bridge'] }), { solve, analyze: null });

        assert.deepStrictEqual(second.warnings, []);
        assert.deepStrictEqual(validatePuzzle({ ...createInput(puzzle).puzzle, tree: { children: [tree.children![0], { move: 'd1', ...second.subtree }] } }), []);
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

        const output = await generatePuzzleTree(input, { solve, analyze: createAnalyzer([losingMove]) });
        const tree: PuzzleNode = output.subtree;
        const failed = tree.children!.find(child => !isElseNode(child) && child.move === losingMove) as PuzzleNode;

        assert.deepStrictEqual(validatePuzzle({ ...input.puzzle, tree }), []);
        assert.strictEqual(failed.result, 'failed');

        // Computer answer is proven winning
        const answer = failed.children![0] as PuzzleNode;

        assert.strictEqual(answer.children, undefined);
        assert.strictEqual(firstChildren[losingMove].winner, 'white');
        assert.strictEqual((await exact.solve({ size: 3, black: [losingMove], white: ['c3', answer.move!], color: 'black', timeLimitSeconds: 1 })).winner, 'white');
        assert.ok(isElseNode(tree.children![tree.children!.length - 1]));
    });
});
