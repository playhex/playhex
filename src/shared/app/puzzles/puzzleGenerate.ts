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
import { findTemplateConnection } from '../../hex-templates/template-connection.js';
import { getColorEdgeConnections } from './edgeConnections.js';

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
     * Computer answers are chosen by puzzle author: generation stops on nodes where computer must answer,
     * see PuzzleGenerateOutput.pending. Author plays them, then generation continues from there.
     * Else computer answers are generated too, best by katahex policy.
     */
    stopAtComputerMoves?: boolean;
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
     * A bridge intrusion could not be made a parallel sequence nor a main move, tree nodes budget exceeded.
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

    /**
     * With stopAtComputerMoves, main sequence moves to reach each node waiting for a computer answer,
     * in tree order. Empty otherwise.
     */
    pending: Move[][];
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

/**
 * Max solver jobs for a generation.
 */
export const GENERATOR_MAX_SOLVES = 8192;

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

/**
 * Stones of a position, see PuzzleDefinition.
 */
export type GeneratePosition = {
    red: Move[];
    blue: Move[];
};

/**
 * Connection checks on puzzle positions, for templates.
 * Fixed cells are stones for templates, e.g a bridge or a connection to edge drawn by puzzle author.
 *
 * @param templateIds Templates player is supposed to know, see PuzzleGenerateInput
 */
export const createPuzzleEndChecker = (puzzle: PuzzleDefinition, templateIds: string[]) => {
    const { boardsize, playerColor } = puzzle;
    const disabledCells = puzzle.disabledCells ?? [];
    const opponentColor = playerColor === 0 ? 1 : 0;
    const initialStones = { redStones: puzzle.redStones, blueStones: puzzle.blueStones };
    const fixedFill = (puzzle.fixedFill ?? []).filter(({ move }) => disabledCells.includes(move));
    const fixedStones = [0, 1].map(color => fixedFill.filter(cell => cell.color === color).map(({ move }) => move));
    const fixedCells = new Set(fixedFill.map(({ move }) => move));
    const templateDisabledCells = disabledCells.filter(cell => !fixedCells.has(cell));

    /**
     * Stones of a color, with fixed cells, see TemplatePosition.
     */
    const templateStones = (position: GeneratePosition, color: 0 | 1): Move[] => [...color === 0 ? position.red : position.blue, ...fixedStones[color]];

    /**
     * Whether color is connected, with these templates and its stones connected to edge.
     */
    const isConnected = (position: GeneratePosition, color: 0 | 1, connectionTemplateIds: string[]): boolean => findTemplateConnection({
        boardsize,
        own: templateStones(position, color),
        opponent: templateStones(position, color === 0 ? 1 : 0),
        disabledCells: templateDisabledCells,
        color,
        templateIds: connectionTemplateIds,
        edgeConnections: getColorEdgeConnections(initialStones, puzzle.edgeConnections, color),
    }) !== null;

    const isOpponentConnected = (position: GeneratePosition): boolean => isConnected(position, opponentColor, []);

    /**
     * Opponent connected, or player connected with acquired templates.
     */
    const isPuzzleEnded = (position: GeneratePosition): boolean =>
        isOpponentConnected(position) || isConnected(position, playerColor, templateIds);

    return { templateStones, templateDisabledCells, isOpponentConnected, isPuzzleEnded };
};
