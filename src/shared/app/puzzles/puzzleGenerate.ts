/**
 * Generates a puzzle tree with Mohex solver, from a position or a node of an existing tree:
 * proven winning moves are accepted, plausible losing ones fail with a refutation,
 * opponent bridges intrusions become parallel sequences.
 *
 * Puzzle ends once player connection is proven with acquired templates, see findTemplateConnection().
 * Generation itself is done on server, see PuzzleTreeGenerator.
 */

import type { Move } from '@playhex/move-notation';
import { findChild, type PuzzleDefinition, type PuzzleError, type PuzzleNode } from './puzzleTree.js';

export type PuzzleGenerateInput = {
    /**
     * Puzzle with current tree, to locate the node to generate from.
     */
    puzzle: PuzzleDefinition;

    /**
     * Main sequence moves to reach the node to generate from, empty for root.
     * Its children and parallel sequences are replaced.
     */
    fromPath: Move[];

    /**
     * Templates player is supposed to know, see HEX_TEMPLATES:
     * puzzle ends once connection is proven with them.
     * Empty: puzzle ends only on a completed connection.
     */
    templateIds: string[];

    /**
     * Number of computer moves played after a failed move, to show why it fails.
     */
    refutationLength: 1 | 2;
};

export type PuzzleGenerateWarningCode =
    /**
     * Player has no proven winning move in start position.
     */
    | 'generator_initial_not_winning'

    /**
     * Player wins only if cells outside the puzzle are its own stones: some stones may be missing an edge connection.
     */
    | 'generator_depends_on_disabled_cells'

    /**
     * Player is already connected in start position, nothing to generate.
     */
    | 'generator_already_connected'

    /**
     * No winning move proven in this position within solver time limit: node left empty.
     */
    | 'generator_unproven'

    /**
     * Too many positions to solve or tree nodes: node left empty.
     */
    | 'generator_budget_exceeded'

    /**
     * A bridge intrusion could not be made a parallel sequence, e.g its cells are used by main sequence.
     * Playing it fails the puzzle.
     */
    | 'generator_parallel_dropped'

    /**
     * Generated tree is not valid, see params.error. Should not happen.
     */
    | 'generator_invalid_tree'
;

/**
 * Same location as PuzzleError, to find node in the tree once generated subtree is inserted.
 */
export type PuzzleGenerateWarning = PuzzleError<PuzzleGenerateWarningCode>;

export type PuzzleGenerateOutput = {
    /**
     * New children and parallel sequences of the node to generate from.
     */
    subtree: Pick<PuzzleNode, 'children' | 'parallel'>;

    warnings: PuzzleGenerateWarning[];
};

export type PuzzleGenerateState = {
    status: 'running' | 'done' | 'failed';

    /**
     * Positions solved, and solves started. Total increases while tree is generated.
     */
    done: number;
    total: number;

    /**
     * Set when status is done.
     */
    output?: PuzzleGenerateOutput;

    /**
     * Set when status is failed.
     */
    error?: string;
};

export const GENERATOR_REFUTATION_LENGTHS = [1, 2] as const;

/**
 * Max solver jobs for a generation.
 */
export const GENERATOR_MAX_SOLVES = 300;

/**
 * Computer moves compared to find the most resisting answer, see findHardestComputerMove().
 * Each one costs a solve.
 */
export const GENERATOR_COMPUTER_CANDIDATES = 4;

/**
 * Max plausible losing moves, by player choice, shown as failed nodes with a refutation.
 * Other ones are answered by "else" node.
 */
export const GENERATOR_MAX_PLAUSIBLE_FAILURES = 3;

/**
 * Node to generate from: main sequence node reached by these moves, puzzle not ended yet.
 * Returns null if moves are not in tree, or reach a node with a result or a continuation.
 */
export const findGenerateStartNode = (tree: PuzzleNode, fromPath: Move[]): null | PuzzleNode => {
    let node = tree;

    for (const move of fromPath) {
        if (node.result !== undefined) {
            return null;
        }

        const child = findChild(node, move);

        if (child === null) {
            return null;
        }

        node = child;
    }

    return node.result === undefined ? node : null;
};
