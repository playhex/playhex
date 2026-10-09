import assert from 'assert';
import { describe, it } from 'mocha';
import { coordsToMove, type Move } from '@playhex/move-notation';
import { checkPuzzleWithSolver } from '../../puzzles/PuzzleSolverChecker.js';
import type { SolvePositionInput, SolvePositionOutput, SolveResult } from '../../ai-jobs/protocol.js';
import type { PuzzleDefinition, PuzzleNode } from '../../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleCheckWarning } from '../../../shared/app/puzzles/puzzleCheck.js';

const BOARDSIZE = 5;
const INITIAL_STONES: Move[] = ['e1'];

/**
 * Red to play: c3, blue answers b3, then b4 solves.
 */
const createTree = (): PuzzleNode => ({
    children: [
        {
            move: 'c3',
            children: [
                {
                    move: 'b3',
                    children: [
                        { move: 'b4' },
                    ],
                },
            ],
        },
        { move: 'a1', result: 'failed' },
    ],
});

const createPuzzle = (overrides: Partial<PuzzleDefinition> = {}): PuzzleDefinition => ({
    boardsize: BOARDSIZE,
    redStones: [],
    blueStones: INITIAL_STONES,
    playerColor: 0,
    tree: createTree(),
    ...overrides,
});

type FakeResult = null | 'black' | 'white' | SolveResult;

/**
 * Winner by moves played from initial position, space separated and sorted.
 * Key can be suffixed by "|black" or "|white", color disabled cells are filled with.
 *
 * Unknown positions: player (red, black) to move wins, else its last move loses.
 */
type FakeWinners = Record<string, FakeResult>;

/**
 * Tree moves are winning: c3, then b4 after b3.
 */
const baseWinners: FakeWinners = { c3: 'black', 'b3 b4 c3': 'black' };

const createSolver = (winners: FakeWinners, disabledCells: Move[] = []) => {
    const calls: SolvePositionInput[] = [];

    const solveResult = (black: Move[], white: Move[], color: 'black' | 'white'): SolveResult => {
        const fill = disabledCells.length === 0 ? '' : black.includes(disabledCells[0]) ? 'black' : 'white';
        const key = [...black, ...white]
            .filter(move => !INITIAL_STONES.includes(move) && !disabledCells.includes(move))
            .sort()
            .join(' ');

        const result = winners[key + '|' + fill] !== undefined ? winners[key + '|' + fill] : winners[key];

        if (result === undefined) {
            return { winner: color, pv: [] };
        }

        return result === null || typeof result === 'string' ? { winner: result, pv: [] } : result;
    };

    const solve = (input: SolvePositionInput): Promise<SolvePositionOutput> => {
        calls.push(input);

        const { black, white, color } = input;
        const output: SolvePositionOutput = solveResult(black, white, color);

        if (input.children) {
            output.children = {};

            for (let row = 0; row < BOARDSIZE; ++row) {
                for (let col = 0; col < BOARDSIZE; ++col) {
                    const move = coordsToMove({ row, col });

                    if (black.includes(move) || white.includes(move)) {
                        continue;
                    }

                    output.children[move] = color === 'black'
                        ? solveResult([...black, move], white, 'white')
                        : solveResult(black, [...white, move], 'black')
                    ;
                }
            }
        }

        return Promise.resolve(output);
    };

    return { solve, calls };
};

const check = (puzzle: PuzzleDefinition, winners: FakeWinners = {}): Promise<PuzzleCheckWarning[]> =>
    checkPuzzleWithSolver(puzzle, { solve: createSolver({ ...baseWinners, ...winners }, puzzle.disabledCells).solve });

describe('PuzzleSolverChecker', () => {
    it('returns no warning when solver agrees with tree, solving each player choice once', async () => {
        const { solve, calls } = createSolver(baseWinners);

        assert.deepStrictEqual(await checkPuzzleWithSolver(createPuzzle(), { solve }), []);
        assert.deepStrictEqual(calls.map(call => [...call.black, ...call.white].sort().join(' ')), ['e1', 'b3 c3 e1']);
    });

    it('warns when initial position is lost', async () => {
        const warnings = await check(createPuzzle(), { '': { winner: 'white', pv: ['c3', 'b3'] } });

        assert.deepStrictEqual(warnings[0], { code: 'solver_initial_not_winning', path: [], params: { pv: 'c3 b3', context: 'pv' } });
    });

    it('warns on winning move not in tree, with proof line', async () => {
        const warnings = await check(createPuzzle(), { e5: { winner: 'black', pv: ['d4', 'e4'] } });

        assert.deepStrictEqual(warnings, [
            { code: 'solver_winning_move_rejected', path: [], params: { move: 'e5', pv: 'd4 e4', context: 'pv' } },
        ]);
    });

    it('warns on winning failed move', async () => {
        assert.deepStrictEqual(await check(createPuzzle(), { a1: 'black' }), [
            { code: 'solver_winning_move_rejected', path: [], child: 1, params: { move: 'a1' } },
        ]);
    });

    it('does not warn on winning move starting a parallel sequence', async () => {
        const tree = createTree();
        tree.parallel = [{ children: [{ move: 'e5', children: [{ move: 'd5' }] }] }];

        assert.deepStrictEqual(await check(createPuzzle({ tree }), { e5: 'black' }), []);
    });

    it('warns on accepted move losing, with refutation', async () => {
        const warnings = await check(createPuzzle(), { c3: { winner: 'white', pv: ['b4'] } });

        assert.deepStrictEqual(warnings, [
            { code: 'solver_accepted_move_not_winning', path: ['c3'], params: { move: 'c3', pv: 'b4', context: 'pv' } },
        ]);
    });

    it('warns when puzzle is solved on a lost position', async () => {
        assert.deepStrictEqual(await check(createPuzzle(), { 'b3 b4 c3': 'white' }), [
            { code: 'solver_solved_not_won', path: ['c3', 'b3', 'b4'], params: {} },
        ]);

        // Solved after computer answer
        const tree: PuzzleNode = { children: [{ move: 'c3', children: [{ move: 'b3', result: 'solved' }] }] };

        assert.deepStrictEqual(await check(createPuzzle({ tree }), { 'b3 c3': 'white' }), [
            { code: 'solver_solved_not_won', path: ['c3', 'b3'], params: {} },
        ]);
    });

    it('reports not proven positions once, without warning on them', async () => {
        assert.deepStrictEqual(await check(createPuzzle(), { c3: null }), [
            { code: 'solver_unproven', params: { count: 1 } },
        ]);
    });

    it('does not report not proven moves that are not in tree', async () => {
        assert.deepStrictEqual(await check(createPuzzle(), { e5: null, d4: null }), []);
    });

    describe('disabled cells', () => {
        it('fills disabled cells with opponent stones to prove a win, with player stones to prove a loss', async () => {
            const puzzle = createPuzzle({ disabledCells: ['d5'] });
            const { solve, calls } = createSolver(baseWinners, ['d5']);

            assert.deepStrictEqual(await checkPuzzleWithSolver(puzzle, { solve }), []);
            assert.strictEqual(calls.length, 4, 'player choices solved once per claim');
            assert.ok(calls.some(call => call.white.includes('d5')));
            assert.ok(calls.some(call => call.black.includes('d5')));
            assert.ok(calls.every(call => !(call.white.includes('d5') && call.black.includes('d5'))));
        });

        it('does not warn when result depends on disabled cells', async () => {
            const puzzle = createPuzzle({ disabledCells: ['d5'] });

            // e5 wins only if d5 were red, c3 loses only if d5 were blue
            assert.deepStrictEqual(await check(puzzle, { 'e5|black': 'black', 'c3|white': 'white' }), []);
        });

        it('warns when result is proven whatever disabled cells', async () => {
            const puzzle = createPuzzle({ disabledCells: ['d5'] });

            assert.deepStrictEqual(await check(puzzle, { e5: 'black', c3: 'white' }), [
                { code: 'solver_winning_move_rejected', path: [], params: { move: 'e5' } },
                { code: 'solver_accepted_move_not_winning', path: ['c3'], params: { move: 'c3' } },
            ]);
        });
    });
});
