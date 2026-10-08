/**
 * Checks a puzzle tree with katahex: tree can be well formed (see validatePuzzle())
 * but logically wrong, e.g a plausible player move not covered, or computer playing a bad move.
 *
 * Results are warnings, not blocking publishing, as katahex can be wrong.
 * Analyze itself is done on server, see PuzzleKatahexChecker.
 */

import type { AnalysisEngine } from '../hexplorer.js';
import type { PuzzleDefinition, PuzzleError } from './puzzleTree.js';

export type PuzzleKatahexWarningCode =
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
;

/**
 * Same location as PuzzleError, to find node in tree.
 * Params are moves, and percentages (winrate, policy) as integers.
 */
export type PuzzleKatahexWarning = PuzzleError<PuzzleKatahexWarningCode>;

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

export type PuzzleKatahexCheckInput = {
    puzzle: PuzzleDefinition;

    /**
     * Engine used to evaluate positions. Defaults to katahex-intuition.
     */
    engine?: AnalysisEngine;
};

export type PuzzleKatahexCheckState = {
    status: 'running' | 'done' | 'failed';
    engine: AnalysisEngine;

    /**
     * Positions analyzed, and to analyze. Total increases while tree is explored.
     */
    done: number;
    total: number;

    warnings: PuzzleKatahexWarning[];

    /**
     * Set when status is failed.
     */
    error?: string;
};
