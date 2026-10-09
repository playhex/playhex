import type { SolvePositionInput, SolveResult } from '../ai-jobs/protocol.js';
import { SOLVER_INTERACTIVE_CHILDREN_MAX_TIME_SECONDS, type PuzzleSolvePositionInput, type PuzzleSolvePositionOutput } from '../../shared/app/puzzles/puzzleCheck.js';
import { toSolveInput, type SolveClaim } from './puzzleCheckUtils.js';
import type { PositionSolver } from './PuzzleSolverChecker.js';

/**
 * Inputs to solve, by claim about player to move, see fillDisabledCells().
 * Same input twice when there is no disabled cell.
 */
export const getPuzzleSolveInputs = (input: PuzzleSolvePositionInput): { [claim in SolveClaim]: SolvePositionInput } => ({
    win: toSolveInput(input, input.color, 'win', SOLVER_INTERACTIVE_CHILDREN_MAX_TIME_SECONDS),
    notWin: toSolveInput(input, input.color, 'notWin', SOLVER_INTERACTIVE_CHILDREN_MAX_TIME_SECONDS),
});

/**
 * Solves a puzzle position and each move of player to move.
 * Only results proven whatever disabled cells are returned.
 *
 * @throws Errors from solve
 */
export const solvePuzzlePosition = async (input: PuzzleSolvePositionInput, solve: PositionSolver): Promise<PuzzleSolvePositionOutput> => {
    const { color } = input;
    const opponent = color === 'black' ? 'white' : 'black';
    const inputs = getPuzzleSolveInputs(input);
    const [win, notWin] = await Promise.all([solve(inputs.win), solve(inputs.notWin)]);

    const proven = (winResult?: SolveResult, notWinResult?: SolveResult): null | 'black' | 'white' => {
        if (winResult?.winner === color) {
            return color;
        }

        if (notWinResult?.winner === opponent) {
            return opponent;
        }

        return null;
    };

    // Disabled cells are filled with stones, so they are not in children
    const moves: PuzzleSolvePositionOutput['moves'] = {};

    for (const [move, child] of Object.entries(win.children ?? {})) {
        moves[move] = proven(child, notWin.children?.[move]);
    }

    return {
        winner: proven(win, notWin),
        moves,
    };
};
