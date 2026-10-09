/**
 * Checks a puzzle tree with katahex: tree can be well formed (see validatePuzzle())
 * but logically wrong, e.g a plausible player move not covered, or computer playing a bad move.
 *
 * Results are warnings, not blocking publishing, as katahex can be wrong.
 * Analyze itself is done on server, see PuzzleKatahexChecker.
 */

import type { Move } from '@playhex/move-notation';
import { ANALYSIS_ENGINES } from '../hexplorer.js';
import type { PuzzleDefinition, PuzzleError } from './puzzleTree.js';

export type PuzzleCheckWarningCode =
    /**
     * Player is not winning in initial position.
     */
    | 'katahex_initial_not_winning'

    /**
     * Plausible player move (katahex policy) not in tree, without "else" node to answer it.
     */
    | 'katahex_uncovered_move'

    /**
     * Player move that katahex finds winning, but fails the puzzle:
     * plausible move not in tree, or child with "failed" result.
     */
    | 'katahex_winning_move_rejected'

    /**
     * Player move accepted by tree, but katahex finds it not winning.
     */
    | 'katahex_accepted_move_not_winning'

    /**
     * Computer answer is worse than another move katahex finds.
     */
    | 'katahex_computer_better_move'

    /**
     * Computer "else" answer is worse than another move katahex finds,
     * after the most likely player move not covered by tree.
     */
    | 'katahex_else_better_move'

    /**
     * Puzzle ends as solved, but position is not won yet.
     */
    | 'katahex_solved_not_won'

    /**
     * Too many positions to analyze, only a part of the tree has been checked.
     */
    | 'katahex_too_many_positions'

    /*
     * Solver warnings are proven, see PuzzleSolverChecker.
     * Params "pv" is the proof line, with context "pv" when not empty.
     */

    /**
     * Player loses in initial position, whatever move.
     */
    | 'solver_initial_not_winning'

    /**
     * Player move that wins, but fails the puzzle.
     */
    | 'solver_winning_move_rejected'

    /**
     * Player move accepted by tree, but losing. pv: computer refutation.
     */
    | 'solver_accepted_move_not_winning'

    /**
     * Puzzle ends as solved, but player loses from there.
     */
    | 'solver_solved_not_won'

    /**
     * Some positions could not be solved within time limit, puzzle has been only partially checked.
     */
    | 'solver_unproven'

    /**
     * Too many positions to solve, only a part of the tree has been checked.
     */
    | 'solver_too_many_positions'
;

/**
 * Same location as PuzzleError, to find node in tree.
 * Params are moves, and percentages (winrate, policy) as integers.
 */
export type PuzzleCheckWarning = PuzzleError<PuzzleCheckWarningCode>;

/**
 * Player winrate from which a position is considered won.
 */
export const KATAHEX_WIN_THRESHOLD = 0.6;

/**
 * Lower threshold for initial position, as puzzle position is often tricky:
 * winning only with the right move, which katahex intuition can miss.
 */
export const KATAHEX_INITIAL_WIN_THRESHOLD = 0.3;

/**
 * A player move is considered plausible, and must be covered by tree,
 * when its policy is at least this ratio of the best move policy in same position.
 * Relative to best move, as policies depend on each other: a position with one obvious move
 * has a high policy for it, and low ones for all others.
 */
export const KATAHEX_PLAUSIBLE_POLICY_RATIO = 0.5;

/**
 * Max plausible player moves checked by position.
 */
export const KATAHEX_MAX_PLAUSIBLE_MOVES = 8;

/**
 * Best computer moves by policy, compared to the computer answer.
 */
export const KATAHEX_COMPUTER_ALTERNATIVES = 3;

/**
 * Winrate difference from which a computer alternative move is considered better.
 */
export const KATAHEX_COMPUTER_DELTA = 0.1;

/**
 * Max positions analyzed for a puzzle.
 */
export const KATAHEX_MAX_POSITIONS = 300;

/**
 * Max time of each solver search, in seconds.
 */
export const SOLVER_TIME_LIMIT_SECONDS = 10;

/**
 * Max time to solve all moves of a player choice, in seconds.
 */
export const SOLVER_CHILDREN_MAX_TIME_SECONDS = 120;

/**
 * Same as SOLVER_CHILDREN_MAX_TIME_SECONDS, when solving a position from editor, user waits for it.
 */
export const SOLVER_INTERACTIVE_CHILDREN_MAX_TIME_SECONDS = 30;

/**
 * Max solver jobs for a puzzle.
 */
export const SOLVER_MAX_JOBS = 100;

/**
 * Engines a puzzle can be checked with:
 * katahex engines evaluate positions, mohex solver proves them.
 */
export const PUZZLE_CHECK_ENGINES = [...ANALYSIS_ENGINES, 'mohex-solver'] as const;

export type PuzzleCheckEngine = typeof PUZZLE_CHECK_ENGINES[number];

export type PuzzleCheckInput = {
    puzzle: PuzzleDefinition;

    /**
     * Engine used to evaluate positions. Defaults to katahex-intuition.
     */
    engine?: PuzzleCheckEngine;
};

export type PuzzleCheckState = {
    status: 'running' | 'done' | 'failed';
    engine: PuzzleCheckEngine;

    /**
     * Positions analyzed, and to analyze. Total increases while tree is explored.
     */
    done: number;
    total: number;

    warnings: PuzzleCheckWarning[];

    /**
     * Set when status is failed.
     */
    error?: string;
};

/**
 * Position to solve from puzzle editor, with player to move.
 */
export type PuzzleSolvePositionInput = {
    size: number;
    color: 'black' | 'white';
    black: Move[];
    white: Move[];
    disabledCells?: Move[];
};

/**
 * Proven winners, null when not proven, or depends on disabled cells.
 */
export type PuzzleSolvePositionOutput = {
    winner: null | 'black' | 'white';

    /**
     * Winner after each empty, not disabled, cell is played.
     */
    moves: { [move: string]: null | 'black' | 'white' };
};
