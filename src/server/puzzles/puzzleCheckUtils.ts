import { coordsToMove, type Move } from '@playhex/move-notation';
import Board from '../../shared/game-engine/Board.js';
import { SOLVER_TIME_LIMIT_SECONDS, type PuzzleSolvePositionInput } from '../../shared/app/puzzles/puzzleCheck.js';
import type { SolvePositionInput } from '../ai-jobs/protocol.js';
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
