import { createHash } from 'node:crypto';
import { coordsToMove, type Move } from '@playhex/move-notation';
import Board from '../../shared/game-engine/Board.js';
import { SOLVER_CHILDREN_MAX_TIME_SECONDS, SOLVER_TIME_LIMIT_SECONDS, type PuzzleSolvePositionInput } from '../../shared/app/puzzles/puzzleCheck.js';
import type { PuzzleDefinition } from '../../shared/app/puzzles/puzzleTree.js';
import type { SolvePositionInput, SolvePositionOutput } from '../ai-jobs/protocol.js';
import { solveCacheKey } from '../ai-jobs/PositionSolveCache.js';
import { fillDisabledCells, getEdgePaths, type EdgePaths, type SolveClaim } from '../../shared/app/puzzles/edgeConnections.js';

/**
 * Position while walking a puzzle tree. Stones count can be inconsistent with player to move.
 */
export type Position = {
    red: Move[];
    blue: Move[];
    toMove: 0 | 1;
};

export { fillDisabledCells, type SolveClaim };

/**
 * Paths of edge connections of a solved position, black being red.
 */
export const getSolveEdgePaths = ({ size, black, white, disabledCells = [], edgeConnections = [], fixedFill = [] }: PuzzleSolvePositionInput): EdgePaths =>
    getEdgePaths({ boardsize: size, redStones: black, blueStones: white, disabledCells, fixedFill }, edgeConnections);

/**
 * Input to send to solver, disabled cells filled depending on claim about player.
 *
 * @param edgePaths From getSolveEdgePaths(input), computed once for both claims
 * @param childrenMaxTimeSeconds Also solves children within this time, see SolvePositionInput.children
 */
export const toSolveInput = (
    input: PuzzleSolvePositionInput,
    player: 'black' | 'white',
    claim: SolveClaim,
    edgePaths: EdgePaths,
    childrenMaxTimeSeconds?: number,
): SolvePositionInput => ({
    size: input.size,
    color: input.color,
    ...fillDisabledCells(input.black, input.white, input.disabledCells ?? [], player, claim, edgePaths, input.fixedFill),
    timeLimitSeconds: SOLVER_TIME_LIMIT_SECONDS,
    ...(childrenMaxTimeSeconds === undefined ? {} : { children: { maxTimeSeconds: childrenMaxTimeSeconds } }),
});

export const toColor = (player: 0 | 1): 'black' | 'white' => player === 0 ? 'black' : 'white';

export const play = ({ red, blue, toMove }: Position, move: Move): Position => ({
    red: toMove === 0 ? [...red, move] : red,
    blue: toMove === 1 ? [...blue, move] : blue,
    toMove: toMove === 0 ? 1 : 0,
});

/**
 * Winner if a player already connected its sides, else null.
 */
export const getWinner = (boardsize: number, { red, blue }: Position): null | 0 | 1 => {
    const board = new Board(boardsize);

    red.forEach(move => board.setCell(move, 0));
    blue.forEach(move => board.setCell(move, 1));

    return board.calculateWinner();
};

/**
 * Moves from a katahex policy, best first, with their policy normalized over empty cells.
 * Occupied cells are excluded, and excluded cells are not returned but still count in normalization.
 */
export const getPolicyCandidates = (policy: number[][], boardsize: number, occupied: Set<Move>, excluded: Set<Move>): { move: Move, policy: number }[] => {
    const candidates: { move: Move, policy: number }[] = [];
    let total = 0;

    policy.forEach((line, row) => line.forEach((value, col) => {
        const move = coordsToMove({ row, col });

        if (row >= boardsize || col >= boardsize || occupied.has(move) || !(value > 0)) {
            return;
        }

        total += value;

        if (!excluded.has(move)) {
            candidates.push({ move, policy: value });
        }
    }));

    return candidates
        .map(candidate => ({ ...candidate, policy: candidate.policy / total }))
        .sort((a, b) => b.policy - a.policy)
    ;
};

/**
 * Runs at most `concurrency` tasks at same time.
 */
export const createLimiter = (concurrency: number) => {
    let running = 0;
    const waiting: (() => void)[] = [];

    return async <T>(task: () => Promise<T>): Promise<T> => {
        if (running >= concurrency) {
            await new Promise<void>(resolve => waiting.push(resolve));
        }

        ++running;

        try {
            return await task();
        } finally {
            --running;
            waiting.shift()?.();
        }
    };
};

export type Limiter = ReturnType<typeof createLimiter>;

/**
 * Runs jobs once by key, at most `maxJobs`, with progress.
 * Progress total is jobs known to be needed: planned ones, and started ones.
 */
export const createJobRunner = <I, O>(options: {
    run: (input: I) => Promise<O>;
    maxJobs: number;
    limit: Limiter;
    onProgress?: (done: number, total: number) => void;
}) => {
    const jobs = new Map<string, Promise<O>>();
    const knownKeys = new Set<string>();
    let done = 0;
    let budgetExceeded = false;

    const reportProgress = (): void => {
        options.onProgress?.(done, Math.min(knownKeys.size, options.maxJobs));
    };

    /**
     * Returns null when too many jobs have been started.
     */
    const run = (key: string, input: I): null | Promise<O> => {
        let job = jobs.get(key);

        if (job !== undefined) {
            return job;
        }

        if (jobs.size >= options.maxJobs) {
            budgetExceeded = true;
            return null;
        }

        job = options.limit(() => options.run(input)).then(output => {
            ++done;
            reportProgress();
            return output;
        });

        jobs.set(key, job);
        knownKeys.add(key);
        reportProgress();

        return job;
    };

    return {
        run,

        /**
         * Counts a job in progress total before it is started.
         */
        plan: (key: string): void => {
            knownKeys.add(key);
        },

        reportProgress,
        isBudgetExceeded: (): boolean => budgetExceeded,
    };
};

/**
 * Solves positions of a puzzle with Mohex solver, disabled cells filled depending on claim about player,
 * each position once, see createJobRunner().
 */
export const createSolveSession = (puzzle: PuzzleDefinition, options: {
    solve: (input: SolvePositionInput) => Promise<SolvePositionOutput>;
    maxJobs: number;
    limit: Limiter;
    onProgress?: (done: number, total: number) => void;
}) => {
    const { boardsize, playerColor } = puzzle;
    const disabledCells = puzzle.disabledCells ?? [];
    const player = toColor(playerColor);
    const runner = createJobRunner({ ...options, run: options.solve });

    /**
     * Edge paths by position, computed once for both claims, see getSolveEdgePaths().
     */
    const edgePathsCache = new Map<string, EdgePaths>();

    const toInput = ({ red, blue, toMove }: Position, claim: SolveClaim, children: boolean): SolvePositionInput => {
        const input = { size: boardsize, color: toColor(toMove), black: red, white: blue, disabledCells, edgeConnections: puzzle.edgeConnections, fixedFill: puzzle.fixedFill };
        const pathsKey = [...red].sort().join(' ') + '|' + [...blue].sort().join(' ');
        let edgePaths = edgePathsCache.get(pathsKey);

        if (edgePaths === undefined) {
            edgePaths = getSolveEdgePaths(input);
            edgePathsCache.set(pathsKey, edgePaths);
        }

        return toSolveInput(input, player, claim, edgePaths, children ? SOLVER_CHILDREN_MAX_TIME_SECONDS : undefined);
    };

    /**
     * Without disabled cells, both claims give same key, so position is solved once.
     */
    const solveKey = (position: Position, claim: SolveClaim, children: boolean): string =>
        solveCacheKey(toInput(position, claim, children));

    return {
        /**
         * Returns null when too many positions have been solved.
         */
        solve: (position: Position, claim: SolveClaim, children: boolean): null | Promise<SolvePositionOutput> => {
            const input = toInput(position, claim, children);

            return runner.run(solveCacheKey(input), input);
        },

        plan: (position: Position, claim: SolveClaim, children: boolean): void => runner.plan(solveKey(position, claim, children)),
        reportProgress: runner.reportProgress,
        isBudgetExceeded: runner.isBudgetExceeded,
    };
};

/**
 * Identifies a background run on a puzzle: same position and tree, with same options.
 * Messages and texts are ignored, they don't change the run.
 */
export const getPuzzleRunKey = (puzzle: PuzzleDefinition, options: unknown): string => {
    const definition = {
        boardsize: puzzle.boardsize,
        redStones: [...puzzle.redStones].sort(),
        blueStones: [...puzzle.blueStones].sort(),
        disabledCells: [...puzzle.disabledCells ?? []].sort(),
        edgeConnections: puzzle.edgeConnections ?? [],
        fixedFill: puzzle.fixedFill ?? [],
        playerColor: puzzle.playerColor,
        computerPlaysFirst: puzzle.computerPlaysFirst ?? false,
        tree: puzzle.tree,
        options,
    };

    const json = JSON.stringify(definition, (key, value: unknown) => key === 'message' ? undefined : value);

    return createHash('sha1').update(json).digest('hex');
};
