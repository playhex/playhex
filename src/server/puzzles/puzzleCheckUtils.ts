import type { Move } from '@playhex/move-notation';
import Board from '../../shared/game-engine/Board.js';
import { SOLVER_TIME_LIMIT_SECONDS, type PuzzleSolvePositionInput } from '../../shared/app/puzzles/puzzleCheck.js';
import type { SolvePositionInput } from '../ai-jobs/protocol.js';

/**
 * Position while walking a puzzle tree. Stones count can be inconsistent with player to move.
 */
export type Position = {
    red: Move[];
    blue: Move[];
    toMove: 0 | 1;
};

/**
 * What a solve must prove about a player. Decides how disabled cells are filled, see fillDisabledCells().
 */
export type SolveClaim = 'win' | 'notWin';

/**
 * Solver does not know disabled cells, so they are filled with stones.
 * For any player, a disabled cell is never better than its own stone, and never worse than an opponent stone.
 * So to prove player wins, disabled cells are filled with opponent stones,
 * and to prove player does not win, they are filled with player stones.
 */
export const fillDisabledCells = (black: Move[], white: Move[], disabledCells: Move[], player: 'black' | 'white', claim: SolveClaim): { black: Move[], white: Move[] } => {
    const filledWithBlack = (player === 'black') === (claim === 'notWin');

    return {
        black: filledWithBlack ? [...black, ...disabledCells] : black,
        white: filledWithBlack ? white : [...white, ...disabledCells],
    };
};

/**
 * Input to send to solver, disabled cells filled depending on claim about player.
 *
 * @param childrenMaxTimeSeconds Also solves children within this time, see SolvePositionInput.children
 */
export const toSolveInput = (
    { size, color, black, white, disabledCells = [] }: PuzzleSolvePositionInput,
    player: 'black' | 'white',
    claim: SolveClaim,
    childrenMaxTimeSeconds?: number,
): SolvePositionInput => ({
    size,
    color,
    ...fillDisabledCells(black, white, disabledCells, player, claim),
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
