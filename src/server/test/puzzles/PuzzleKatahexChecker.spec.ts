import assert from 'assert';
import { describe, it } from 'mocha';
import { parseMove, type Move } from '@playhex/move-notation';
import { checkPuzzleWithKatahex, type AnalysisPurpose } from '../../puzzles/PuzzleKatahexChecker.js';
import type { AnalysisInput, AnalysisOutput } from '../../../shared/app/hexplorer.js';
import type { PuzzleDefinition, PuzzleNode } from '../../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleKatahexWarning } from '../../../shared/app/puzzles/puzzleKatahexCheck.js';

const BOARDSIZE = 5;

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
    blueStones: ['e1'],
    playerColor: 0,
    tree: createTree(),
    ...overrides,
});

type FakeKatahex = {
    /**
     * Red winrate by moves played from initial position, space separated and sorted. Defaults to 0.9.
     */
    winrates?: Record<string, number>;

    /**
     * Policy by moves played from initial position. Defaults to no plausible move.
     */
    policies?: Record<string, Partial<Record<Move, number>>>;
};

const INITIAL_STONES = ['e1'];

const positionKey = (input: Omit<AnalysisInput, 'engine'>): string => [...input.black, ...input.white]
    .filter(move => !INITIAL_STONES.includes(move))
    .sort()
    .join(' ');

const createAnalyzer = ({ winrates = {}, policies = {} }: FakeKatahex) => {
    const calls: string[] = [];

    const analyze = (input: Omit<AnalysisInput, 'engine'>, purpose: AnalysisPurpose): Promise<AnalysisOutput> => {
        const key = positionKey(input);
        const policy: number[][] = Array.from({ length: BOARDSIZE }, () => Array<number>(BOARDSIZE).fill(0));

        calls.push(`${purpose}:${key}`);

        for (const [move, value] of Object.entries(policies[key] ?? {})) {
            const { row, col } = parseMove(move as Move);
            policy[row][col] = value ?? 0;
        }

        return Promise.resolve({
            whiteWin: 1 - (winrates[key] ?? 0.9),
            policy,
        });
    };

    return { analyze, calls };
};

const check = (puzzle: PuzzleDefinition, katahex: FakeKatahex = {}): Promise<PuzzleKatahexWarning[]> =>
    checkPuzzleWithKatahex(puzzle, { analyze: createAnalyzer(katahex).analyze });

/**
 * a1 is a failed move, must be losing.
 */
const baseWinrates = { a1: 0.1 };

describe('PuzzleKatahexChecker', () => {
    it('returns no warning when katahex agrees with tree', async () => {
        assert.deepStrictEqual(await check(createPuzzle(), { winrates: baseWinrates }), []);
    });

    it('warns when initial position is not winning', async () => {
        const warnings = await check(createPuzzle(), { winrates: { ...baseWinrates, '': 0.2 } });

        assert.deepStrictEqual(warnings, [{ code: 'katahex_initial_not_winning', path: [], params: { winrate: 20 } }]);
        assert.deepStrictEqual(await check(createPuzzle(), { winrates: { ...baseWinrates, '': 0.5 } }), [], 'tricky position, intuition can miss winning move');
    });

    it('warns on plausible move not covered, without else node', async () => {
        const warnings = await check(createPuzzle(), {
            winrates: { ...baseWinrates, e5: 0.2 },
            policies: { '': { c3: 0.59, e5: 0.4, d1: 0.01 } },
        });

        assert.deepStrictEqual(warnings, [{ code: 'katahex_uncovered_move', path: [], params: { move: 'e5', policy: 40 } }]);
    });

    it('considers move plausible relatively to best move policy', async () => {
        const katahex = (policies: Partial<Record<Move, number>>) => ({
            winrates: { ...baseWinrates, e5: 0.2 },
            policies: { '': policies },
        });

        // e5 far behind best move c3
        assert.deepStrictEqual(await check(createPuzzle(), katahex({ c3: 0.9, e5: 0.1 })), []);

        // e5 close to best move c3, even with a low policy
        assert.deepStrictEqual(await check(createPuzzle(), katahex({ c3: 0.04, e5: 0.03, d1: 0.01, d2: 0.01, d3: 0.01 })), [
            { code: 'katahex_uncovered_move', path: [], params: { move: 'e5', policy: 30 } },
        ]);
    });

    it('ignores plausible move on disabled cell', async () => {
        const warnings = await check(createPuzzle({ disabledCells: ['e5'] }), {
            winrates: { ...baseWinrates, e5: 0.2 },
            policies: { '': { c3: 0.5, e5: 0.4 } },
        });

        assert.deepStrictEqual(warnings, []);
    });

    it('does not warn on plausible move answered by else node', async () => {
        const tree = createTree();
        tree.children!.push({ else: 'c3' });

        const warnings = await check(createPuzzle({ tree }), {
            winrates: { ...baseWinrates, e5: 0.2 },
            policies: { '': { c3: 0.5, e5: 0.4 } },
        });

        assert.deepStrictEqual(warnings, []);
    });

    it('does not warn on plausible move starting a parallel sequence', async () => {
        const tree = createTree();
        tree.parallel = [{ children: [{ move: 'e5', children: [{ move: 'd5' }] }] }];

        const katahex = {
            winrates: { ...baseWinrates, e5: 0.95, 'b3 c3 e5': 0.95 },
            policies: { '': { c3: 0.6, e5: 0.4 }, 'b3 c3': { b4: 0.6, e5: 0.4 } },
        };

        // Also playable from descendants
        assert.deepStrictEqual(await check(createPuzzle({ tree }), katahex), []);
    });

    it('warns on winning move rejected', async () => {
        const warnings = await check(createPuzzle(), {
            winrates: { ...baseWinrates, e5: 0.95, a1: 0.9 },
            policies: { '': { c3: 0.6, e5: 0.4 } },
        });

        assert.deepStrictEqual(warnings, [
            { code: 'katahex_winning_move_rejected', path: [], params: { move: 'e5', winrate: 95, policy: 40 } },
            { code: 'katahex_winning_move_rejected', path: [], child: 1, params: { move: 'a1', winrate: 90 } },
        ]);
    });

    it('warns on accepted move not winning', async () => {
        const warnings = await check(createPuzzle(), { winrates: { ...baseWinrates, c3: 0.5 } });

        assert.deepStrictEqual(warnings, [{ code: 'katahex_accepted_move_not_winning', path: ['c3'], params: { move: 'c3', winrate: 50 } }]);
    });

    it('considers move as rejected when all its lines fail', async () => {
        const tree = createTree();
        tree.children!.push({ move: 'b2', children: [{ move: 'd3', result: 'failed' }] });

        assert.deepStrictEqual(await check(createPuzzle({ tree }), { winrates: { ...baseWinrates, b2: 0.2, 'b2 d3': 0.1 } }), []);

        assert.deepStrictEqual(await check(createPuzzle({ tree }), { winrates: { ...baseWinrates, b2: 0.9, 'b2 d3': 0.9 } }), [
            { code: 'katahex_winning_move_rejected', path: [], child: 2, params: { move: 'b2', winrate: 90 } },
        ]);
    });

    it('warns when computer has a better move', async () => {
        const warnings = await check(createPuzzle(), {
            winrates: { ...baseWinrates, 'a2 c3': 0.3 },
            policies: { c3: { a2: 0.6, b3: 0.3 } },
        });

        assert.deepStrictEqual(warnings, [{
            code: 'katahex_computer_better_move',
            path: ['c3', 'b3'],
            params: { move: 'b3', winrate: 10, best: 'a2', bestWinrate: 70 },
        }]);
    });

    it('checks else answer against most likely uncovered move', async () => {
        const tree = createTree();
        tree.children!.push({ else: 'd4' });

        const warnings = await check(createPuzzle({ tree }), {
            winrates: { ...baseWinrates, e5: 0.2, d4: 0.2, 'd4 e5': 0.6, 'a5 e5': 0.1 },
            policies: {
                '': { c3: 0.5, e5: 0.3, d4: 0.2 },
                e5: { a5: 0.7, d4: 0.2 },
            },
        });

        assert.deepStrictEqual(warnings, [{
            code: 'katahex_else_better_move',
            path: [],
            child: 2,
            params: { move: 'd4', winrate: 40, best: 'a5', bestWinrate: 90, playerMove: 'e5' },
        }]);
    });

    it('warns when solved leaf is not won', async () => {
        const warnings = await check(createPuzzle(), { winrates: { ...baseWinrates, 'b3 b4 c3': 0.5 } });

        assert.deepStrictEqual(warnings, [{ code: 'katahex_solved_not_won', path: ['c3', 'b3', 'b4'], params: { winrate: 50 } }]);
    });

    it('does not analyze an already won position', async () => {
        const { analyze, calls } = createAnalyzer({ winrates: baseWinrates });

        // Red connects top to bottom with c3
        const puzzle = createPuzzle({ redStones: ['c1', 'c2', 'c4', 'c5'] });
        const warnings = await checkPuzzleWithKatahex(puzzle, { analyze });

        assert.deepStrictEqual(calls.filter(call => call.startsWith('value:') && call.includes('c3')), []);
        assert.ok(!warnings.some(warning => warning.path?.includes('c3')));
    });

    it('ignores continuation and transposition leaf', async () => {
        const tree: PuzzleNode = {
            children: [
                {
                    move: 'c3',
                    children: [
                        {
                            move: 'b3',
                            children: [
                                { move: 'b4', result: 'solved', children: [{ move: 'a5' }] },
                                { move: 'd2' },
                            ],
                        },
                    ],
                },
                { move: 'a1', result: 'failed' },
            ],
        };

        const { analyze, calls } = createAnalyzer({ winrates: baseWinrates });

        await checkPuzzleWithKatahex(createPuzzle({ tree }), { analyze });

        assert.ok(!calls.some(call => call.includes('a5')), 'continuation not analyzed');
    });

    it('knows tree positions to analyze from start', async () => {
        const progress: [number, number][] = [];

        await checkPuzzleWithKatahex(createPuzzle(), {
            analyze: createAnalyzer({ winrates: baseWinrates }).analyze,
            onProgress: (done, total) => progress.push([done, total]),
        });

        // initial: value + policy, c3 and a1: value, after c3: policy, b3: value + policy, b4: value
        assert.deepStrictEqual(progress[0], [0, 8]);
        assert.ok(progress.every(([, total]) => total === 8));
    });

    it('analyzes each position only once', async () => {
        const { analyze, calls } = createAnalyzer({
            winrates: baseWinrates,
            policies: { '': { c3: 0.5, a1: 0.3 } },
        });

        await checkPuzzleWithKatahex(createPuzzle(), { analyze });

        assert.strictEqual(new Set(calls).size, calls.length);
    });
});
