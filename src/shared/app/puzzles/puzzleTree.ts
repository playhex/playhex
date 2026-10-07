/**
 * Puzzle decision tree, as pure functions: no database, no Vue.
 *
 * A puzzle starts from an initial position (red and blue stones, not necessarily legal),
 * then the player and the computer play alternately, following the tree:
 *
 * - root: initial position, no move. Its children are the moves accepted from the player.
 * - player move node: its first child, if any, is the computer answer.
 *   Other children are not played.
 * - computer move node: its children are the moves accepted from the player.
 *
 * Reaching a node with `result`, or without children, ends the puzzle,
 * with `result` or "solved" by default.
 *
 * A node with `result` can still have children: a continuation, played after the puzzle ended
 * (e.g to show how the game goes on). Nodes in a continuation must not have a `result`.
 * After the end, player can also play moves not in tree, for both colors.
 *
 * A move from the player that is not in the tree fails the puzzle,
 * unless an "else" node is defined: last child of a player choice,
 * it is played when player plays any other move. Its `else` is the computer answer,
 * e.g to show a threat if player did not defend. An "else" node is always a failing leaf.
 *
 * Transposition: a same position can be reached by different move orders.
 * A leaf without result, reaching the same position as another node having children or a result,
 * continues from this other node, as if it was the same node: see findTranspositions().
 * Two nodes with children or result must not have the same position.
 *
 * Parallel sequences: independent sequences, e.g a forcing move and its answer
 * that can be played at any time between moves of the main sequence.
 * Declared in `parallel` of a player choice node having children, they can be played anywhere in its subtree,
 * without changing the current node of main sequence. Each one is a root-like node:
 * no move, children are player choices, each player move has a computer answer.
 * They are optional: only main sequence solves the puzzle, but a failed node in a parallel sequence fails it.
 * Leaf without result in a parallel sequence just goes back to main sequence.
 * Their cells must not be used by main sequence nor other parallel sequences.
 * Not to be confused with transpositions, which merge two nodes reaching same position.
 *
 * Example, player must play c3, then b4 or d2 after computer answers b3.
 * Any other first move is answered by c3. Game goes on after b4:
 *
 * ```json
 * {
 *     "message": "Red to play and connect",
 *     "children": [
 *         {
 *             "move": "c3",
 *             "children": [
 *                 {
 *                     "move": "b3",
 *                     "message": "Now block...",
 *                     "children": [
 *                         {
 *                             "move": "b4",
 *                             "message": "Well done!",
 *                             "result": "solved",
 *                             "children": [{ "move": "a5", "message": "Blue tries to escape" }]
 *                         },
 *                         { "move": "d2" }
 *                     ]
 *                 }
 *             ]
 *         },
 *         { "move": "a1", "result": "failed", "message": "Looks good, but blue answers b2" },
 *         { "else": "c3", "message": "Blue plays c3 and cuts" }
 *     ]
 * }
 * ```
 */

import { parseMove, validateMove, type Move } from '@playhex/move-notation';
import { MAX_BOARDSIZE, MIN_BOARDSIZE } from '../boardsizeLimits.js';

export type PuzzleResult = 'solved' | 'failed';

export type PuzzleNode = {
    /**
     * Move played to reach this node. Absent on root.
     */
    move?: Move;

    /**
     * Message to display when reaching this position.
     */
    message?: null | string;

    /**
     * Ends the puzzle with this result when reaching this node.
     * Children, if any, are a continuation played after the end.
     */
    result?: PuzzleResult;

    children?: (PuzzleNode | PuzzleElseNode)[];

    /**
     * Independent sequences, playable at any time in this node subtree, between main moves.
     * Each one is a root-like node: no move, children are player choices.
     */
    parallel?: PuzzleNode[];
};

/**
 * Applies when player plays a move not in tree:
 * computer answers with `else` move, then puzzle is failed.
 */
export type PuzzleElseNode = {
    /**
     * Computer answer.
     */
    else: Move;

    message?: null | string;

    /**
     * Always failed, can be omitted.
     */
    result?: 'failed';
};

/**
 * Data required to check a puzzle consistency.
 */
export type PuzzleDefinition = {
    title?: null | string;
    description?: null | string;
    boardsize: number;
    redStones: Move[];
    blueStones: Move[];

    /**
     * Cells that cannot be played. Considered occupied: no initial stone nor tree move on them.
     */
    disabledCells?: Move[];

    lastMove?: null | Move;
    playerColor: 0 | 1;
    tree: PuzzleNode;
};

/**
 * Body sent to create or edit a puzzle.
 */
export type PuzzleInput = PuzzleDefinition & {
    published: boolean;

    /**
     * Game this puzzle comes from. Only on creation.
     */
    gamePublicId?: null | string;

    /**
     * Collection to put this puzzle in, null to remove it from its collection.
     * Undefined keeps current collection.
     */
    collectionPublicId?: null | string;
};

export const PUZZLE_TITLE_MAX_LENGTH = 64;
export const PUZZLE_DESCRIPTION_MAX_LENGTH = 2048;
export const PUZZLE_MESSAGE_MAX_LENGTH = 512;
export const PUZZLE_MAX_NODES = 512;

export const isElseNode = (node: PuzzleNode | PuzzleElseNode): node is PuzzleElseNode =>
    'else' in node;

/**
 * Child of this node played with this move, or null if this move is not in tree.
 */
export const findChild = (node: PuzzleNode, move: Move): null | PuzzleNode =>
    node.children?.find((child): child is PuzzleNode => !isElseNode(child) && child.move === move) ?? null;

/**
 * "else" node of this player choice, or null if any move not in tree fails directly.
 */
export const findElseNode = (node: PuzzleNode): null | PuzzleElseNode => {
    const last = node.children?.[node.children.length - 1];

    return last && isElseNode(last) ? last : null;
};

/**
 * Computer answer to the player move node, or null if no answer.
 */
export const getComputerAnswer = (playerMoveNode: PuzzleNode): null | PuzzleNode => {
    const answer = playerMoveNode.children?.[0];

    return answer && !isElseNode(answer) ? answer : null;
};

/**
 * Whether reaching this node ends the puzzle, and with which result.
 * Returns null if puzzle continues.
 *
 * @param ended Whether puzzle already ended before this node, i.e node is in a continuation.
 *              Then always returns null: result cannot change anymore.
 */
export const getNodeResult = (node: PuzzleNode | PuzzleElseNode, ended = false): null | PuzzleResult => {
    if (ended) {
        return null;
    }

    if (isElseNode(node)) {
        return 'failed';
    }

    if (node.result) {
        return node.result;
    }

    if (!node.children || node.children.length === 0) {
        return 'solved';
    }

    return null;
};

/**
 * Root of a parallel sequence: not a move, see PuzzleNode.parallel.
 * Do not use on tree root.
 */
export const isParallelRoot = (node: PuzzleNode | PuzzleElseNode): boolean =>
    !isElseNode(node) && node.move === undefined;

/**
 * Nodes of a path from root having a move: without parallel sequences roots.
 */
export const filterMoveNodes = <T extends PuzzleNode | PuzzleElseNode>(path: T[]): T[] =>
    path.filter(node => !isParallelRoot(node));

/**
 * Same as getNodeResult(), for a node in a parallel sequence:
 * it can fail the puzzle, but not solve it, as parallel sequences are optional.
 */
export const getParallelNodeResult = (node: PuzzleNode): null | PuzzleResult =>
    node.result === 'failed' ? 'failed' : null;

/**
 * Returns node to continue from: the transposition target, or node itself.
 * See createNodeResolver().
 */
export type NodeResolver = (node: PuzzleNode) => PuzzleNode;

/**
 * Nodes to reach from this node to solve the puzzle, player moves and computer answers,
 * following first winning player move at each step.
 * Returns empty list if node is already solved, or null if puzzle cannot be solved from this node.
 *
 * @param resolve To follow transpositions, see createNodeResolver()
 * @param isPlayerMove Whether this node is a player move, so computer answers next
 */
export const findSolution = (originalNode: PuzzleNode, resolve: NodeResolver, isPlayerMove = false): null | PuzzleNode[] => {
    const node = resolve(originalNode);
    const result = getNodeResult(node);

    if (result !== null) {
        return result === 'solved' ? [] : null;
    }

    const candidates: PuzzleNode[] = isPlayerMove
        ? [getComputerAnswer(node)].filter(answer => answer !== null)
        : node.children!.filter(child => !isElseNode(child))
    ;

    for (const child of candidates) {
        const solution = findSolution(child, resolve, !isPlayerMove);

        if (solution !== null) {
            return [child, ...solution];
        }
    }

    return null;
};

/**
 * Identifies a position reached in tree, whatever moves order.
 * Initial stones are ignored as they are same for all nodes.
 *
 * @param moves Moves from root, alternating player and computer
 */
export const getPositionKey = (moves: Move[]): string => [0, 1]
    .map(parity => moves.filter((_, index) => index % 2 === parity).sort().join(','))
    .join('|')
;

/**
 * Position key, prefixed by whether node is in a continuation:
 * a same position in and out of continuation is not a transposition.
 *
 * @param ended Whether puzzle ended before this node (an ancestor has a result)
 */
const getNodeKey = (moves: Move[], ended: boolean): string =>
    `${ended ? 'ended' : 'live'}:${getPositionKey(moves)}`;

/**
 * Node having children or a result, so it cannot be a transposition.
 * Accepts unchecked node, see validatePuzzle().
 */
const isDefinedNode = (node: { result?: unknown, children?: unknown }): boolean =>
    node.result !== undefined || (Array.isArray(node.children) && node.children.length > 0);

export type Transposition = {
    /**
     * Node to continue from.
     */
    target: PuzzleNode;

    /**
     * Nodes from root (excluded) to target.
     */
    path: PuzzleNode[];

    /**
     * Moves from root to target.
     */
    moves: Move[];
};

type PositionedNode = {
    node: PuzzleNode;

    /**
     * Nodes from root (excluded) to this node.
     */
    path: PuzzleNode[];

    /**
     * Moves from root to this node.
     */
    moves: Move[];

    /**
     * See getNodeKey().
     */
    key: string;
};

const sameItems = (a: unknown[], b: unknown[]): boolean =>
    a.length === b.length && a.every((item, index) => item === b[index]);

const toTransposition = ({ node, path, moves }: PositionedNode): Transposition => ({ target: node, path, moves });

/**
 * All nodes except root and "else" nodes, depth first, with their position.
 */
const listPositionedNodes = (tree: PuzzleNode): PositionedNode[] => {
    const list: PositionedNode[] = [];

    const walk = (node: PuzzleNode, path: PuzzleNode[], moves: Move[], ended: boolean): void => {
        const childrenEnded = ended || node.result !== undefined;

        for (const child of node.children ?? []) {
            if (isElseNode(child) || child.move === undefined) {
                continue;
            }

            const childPath = [...path, child];
            const childMoves = [...moves, child.move];

            list.push({ node: child, path: childPath, moves: childMoves, key: getNodeKey(childMoves, childrenEnded) });
            walk(child, childPath, childMoves, childrenEnded);
        }
    };

    walk(tree, [], [], false);

    return list;
};

/**
 * Leaves without result reaching same position as another node having children or a result.
 * Puzzle continues from this other node.
 *
 * @returns Transposition by leaf
 */
export const findTranspositions = (tree: PuzzleNode): Map<PuzzleNode, Transposition> => {
    const nodes = listPositionedNodes(tree);
    const definedByKey = new Map<string, PositionedNode>();

    for (const positioned of nodes) {
        if (isDefinedNode(positioned.node) && !definedByKey.has(positioned.key)) {
            definedByKey.set(positioned.key, positioned);
        }
    }

    const transpositions = new Map<PuzzleNode, Transposition>();

    for (const { node, key } of nodes) {
        const target = definedByKey.get(key);

        if (target && !isDefinedNode(node)) {
            transpositions.set(node, toTransposition(target));
        }
    }

    return transpositions;
};

/**
 * Follows transpositions of this tree.
 */
export const createNodeResolver = (tree: PuzzleNode): NodeResolver => {
    const transpositions = findTranspositions(tree);

    return node => transpositions.get(node)?.target ?? node;
};

/**
 * Returns parallel sequences roots playable from this main sequence node:
 * declared on it or on its ancestors.
 */
export type ParallelsFinder = (node: PuzzleNode) => PuzzleNode[];

export const createParallelsFinder = (tree: PuzzleNode): ParallelsFinder => {
    const parallelsByNode = new Map<PuzzleNode, PuzzleNode[]>();

    const walk = (node: PuzzleNode, inherited: PuzzleNode[]): void => {
        const parallels = node.parallel?.length ? [...inherited, ...node.parallel] : inherited;

        parallelsByNode.set(node, parallels);

        for (const child of node.children ?? []) {
            if (!isElseNode(child)) {
                walk(child, parallels);
            }
        }
    };

    walk(tree, []);

    return node => parallelsByNode.get(node) ?? [];
};

/**
 * Node to continue from when reaching same position as this node:
 * first node with this position having children or a result, else first node with this position.
 * Returns null if it is this node, i.e this node can be continued.
 */
export const findSamePositionNode = (tree: PuzzleNode, node: PuzzleNode): null | Transposition => {
    const nodes = listPositionedNodes(tree);
    const key = nodes.find(positioned => positioned.node === node)?.key;
    const samePosition = nodes.filter(positioned => positioned.key === key);
    const other = samePosition.find(positioned => isDefinedNode(positioned.node)) ?? samePosition[0];

    return other === undefined || other.node === node ? null : toTransposition(other);
};

const isInBoard = (move: Move, boardsize: number): boolean => {
    const { row, col } = parseMove(move);

    return row >= 0 && col >= 0 && row < boardsize && col < boardsize;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const NODE_KEYS = ['move', 'message', 'result', 'children', 'parallel'];
const ELSE_NODE_KEYS = ['else', 'message', 'result'];
const PARALLEL_ROOT_KEYS = ['children'];

/**
 * Cells used by moves of this node descendants, "else" answers and parallel sequences included.
 * Accepts unchecked node, see validatePuzzle().
 */
const collectCells = (node: unknown, cells = new Set<string>()): Set<string> => {
    if (!isObject(node)) {
        return cells;
    }

    for (const child of [
        ...(Array.isArray(node.children) ? node.children : []),
        ...(Array.isArray(node.parallel) ? node.parallel : []),
    ]) {
        if (!isObject(child)) {
            continue;
        }

        if (typeof child.move === 'string') {
            cells.add(child.move);
        }

        if (typeof child.else === 'string') {
            cells.add(child.else);
        }

        collectCells(child, cells);
    }

    return cells;
};

export type PuzzleErrorCode =
    | 'invalid_boardsize'
    | 'invalid_type'
    | 'title_too_long'
    | 'description_too_long'
    | 'invalid_player_color'
    | 'invalid_stones'
    | 'empty_position'
    | 'last_move_not_opponent'
    | 'invalid_tree'
    | 'empty_tree'
    | 'no_solution'
    | 'too_many_nodes'
    | 'root_has_move'
    | 'root_has_result'
    | 'invalid_move'
    | 'outside_board'
    | 'occupied'
    | 'set_twice'
    | 'unexpected_property'
    | 'message_too_long'
    | 'invalid_result'
    | 'result_in_continuation'
    | 'children_not_list'
    | 'node_not_object'
    | 'computer_one_answer'
    | 'else_as_computer_answer'
    | 'else_in_continuation'
    | 'else_not_last'
    | 'else_always_failed'
    | 'duplicate_position'
    | 'parallel_not_list'
    | 'parallel_on_computer_move'
    | 'parallel_in_continuation'
    | 'parallel_nested'
    | 'empty_parallel'
    | 'else_in_parallel'
    | 'solved_in_parallel'
    | 'parallel_missing_answer'
    | 'parallel_overlap'
    | 'parallel_transposition'
    | 'parallel_on_leaf'
;

/**
 * Where a node is in a parallel sequence.
 */
export type PuzzleErrorParallel = {
    /**
     * Index of the parallel sequence in `parallel` of the node declaring it.
     */
    index: number;

    /**
     * Moves played in the parallel sequence to reach the node, empty for its root.
     */
    path: Move[];
};

/**
 * Validation error, as a code to translate on client side,
 * see "puzzles.errors" translations.
 */
export type PuzzleError = {
    code: PuzzleErrorCode;

    /**
     * Main sequence moves played to reach the tree node where the error is, empty for root.
     * When error is in a parallel sequence, moves to reach the node declaring it.
     * Undefined when error is not in tree.
     */
    path?: Move[];

    /**
     * Set when error is in a parallel sequence declared on node at `path`.
     */
    parallel?: PuzzleErrorParallel;

    /**
     * Set when error is on a child of node at this location: its index in `children`.
     * Used for child moves (e.g. occupied cell, set twice) and "else" nodes, which have no own path.
     */
    child?: number;

    params?: Record<string, string | number>;
};

/**
 * Errors on data that cannot be stored, so puzzle cannot even be saved as a draft.
 * Other errors are on an incomplete or inconsistent puzzle, and only prevent publishing it.
 */
const DRAFT_BLOCKING_ERRORS: PuzzleErrorCode[] = [
    'invalid_boardsize',
    'invalid_type',
    'title_too_long',
    'description_too_long',
    'invalid_player_color',
    'invalid_stones',
    'invalid_tree',
    'too_many_nodes',
    'invalid_move',
    'outside_board',
    'unexpected_property',
    'message_too_long',
    'invalid_result',
    'children_not_list',
    'node_not_object',
    'parallel_not_list',
];

/**
 * Whether this error prevents saving puzzle, even as a draft.
 */
export const isDraftBlockingError = (error: PuzzleError): boolean =>
    DRAFT_BLOCKING_ERRORS.includes(error.code);

/**
 * Trimmed text, or null if empty. Other values are kept as is, to be rejected by validatePuzzle().
 */
export const normalizePuzzleText = (value?: null | string): null | string =>
    typeof value === 'string'
        ? value.trim() || null
        : value ?? null
;

/**
 * Tree node where this error is, to highlight it.
 *
 * @returns Null when error is not in tree, or its node cannot be found (e.g. not an object)
 */
export const findErrorNode = (tree: PuzzleNode, { path, parallel, child }: PuzzleError): null | PuzzleNode | PuzzleElseNode => {
    if (path === undefined) {
        return null;
    }

    const followMoves = (node: null | PuzzleNode, moves: Move[]): null | PuzzleNode =>
        moves.reduce<null | PuzzleNode>((current, move) => current && findChild(current, move), node);

    let node = followMoves(tree, path);

    if (node !== null && parallel !== undefined) {
        node = followMoves(node.parallel?.[parallel.index] ?? null, parallel.path);
    }

    if (node === null || child === undefined) {
        return node;
    }

    return node.children?.[child] ?? null;
};

/**
 * Not translated, for server side error messages.
 */
export const puzzleErrorToString = ({ code, path, parallel, params }: PuzzleError): string =>
    [
        code,
        path === undefined ? null : `after "${path.join(' ') || 'root'}"`,
        parallel === undefined ? null : `in parallel ${parallel.index + 1} after "${parallel.path.join(' ') || 'root'}"`,
        params === undefined ? null : JSON.stringify(params),
    ].filter(part => part !== null).join(' ');

/**
 * Checks that puzzle is consistent: not empty, can be solved, moves inside board,
 * no move on an occupied cell, computer has at most one answer...
 * Also checks types and sizes, as puzzle can come from user input.
 *
 * @returns List of errors, empty if puzzle is valid.
 */
export const validatePuzzle = (puzzle: PuzzleDefinition): PuzzleError[] => {
    const errors: PuzzleError[] = [];
    const { boardsize } = puzzle;

    if (!Number.isInteger(boardsize) || boardsize < MIN_BOARDSIZE || boardsize > MAX_BOARDSIZE) {
        return [{ code: 'invalid_boardsize', params: { boardsize: String(boardsize) } }];
    }

    /**
     * Where a node is in tree, see PuzzleError.
     */
    type Location = {
        path: Move[];
        parallel?: PuzzleErrorParallel;
        child?: number;
    };

    /**
     * Location of a child of node at this location, reached by this move.
     */
    const childLocation = ({ path, parallel }: Location, move: Move): Location => parallel === undefined
        ? { path: [...path, move] }
        : { path, parallel: { index: parallel.index, path: [...parallel.path, move] } }
    ;

    /**
     * Error at this location, or not in tree when location is undefined.
     */
    const addError = (code: PuzzleErrorCode, location?: Location, params?: PuzzleError['params']): void => {
        errors.push({ code, ...location, ...(params === undefined ? {} : { params }) });
    };

    /**
     * @param location Undefined when text is not in tree
     */
    const checkText = (value: unknown, property: string, maxLength: number, tooLongCode: PuzzleErrorCode, location?: Location): void => {
        if (value == null) {
            return;
        }

        if (typeof value !== 'string') {
            addError('invalid_type', location, { property });
        } else if (value.length > maxLength) {
            addError(tooLongCode, location, { max: maxLength });
        }
    };

    checkText(puzzle.title, 'title', PUZZLE_TITLE_MAX_LENGTH, 'title_too_long');
    checkText(puzzle.description, 'description', PUZZLE_DESCRIPTION_MAX_LENGTH, 'description_too_long');

    if (puzzle.playerColor !== 0 && puzzle.playerColor !== 1) {
        errors.push({ code: 'invalid_player_color', params: { color: String(puzzle.playerColor) } });
    }

    const disabledCells = puzzle.disabledCells ?? [];

    if (!Array.isArray(puzzle.redStones) || !Array.isArray(puzzle.blueStones) || !Array.isArray(disabledCells)) {
        return [...errors, { code: 'invalid_stones' }];
    }

    if (!isObject(puzzle.tree)) {
        return [...errors, { code: 'invalid_tree' }];
    }

    /**
     * @param location Undefined for initial stones
     */
    const checkMove = (move: unknown, location?: Location): move is Move => {
        if (typeof move !== 'string' || !validateMove(move)) {
            addError('invalid_move', location, { move: String(move) });
            return false;
        }

        if (!isInBoard(move, boardsize)) {
            addError('outside_board', location, { move });
            return false;
        }

        return true;
    };

    const checkMessage = (node: Record<string, unknown>, location: Location): void =>
        checkText(node.message, 'message', PUZZLE_MESSAGE_MAX_LENGTH, 'message_too_long', location);

    const checkKeys = (node: Record<string, unknown>, allowedKeys: string[], location: Location): void => {
        for (const key of Object.keys(node)) {
            if (!allowedKeys.includes(key)) {
                addError('unexpected_property', location, { property: key });
            }
        }
    };

    const initialStones = new Set<Move>();

    // Disabled cells are occupied, so no stone nor tree move can be on them
    for (const move of [...puzzle.redStones, ...puzzle.blueStones, ...disabledCells]) {
        if (!checkMove(move)) {
            continue;
        }

        if (initialStones.has(move)) {
            errors.push({ code: 'set_twice', params: { move } });
        }

        initialStones.add(move);
    }

    if (puzzle.redStones.length + puzzle.blueStones.length === 0) {
        errors.push({ code: 'empty_position', path: [] });
    }

    if (puzzle.lastMove != null && checkMove(puzzle.lastMove)) {
        const opponentStones = puzzle.playerColor === 0 ? puzzle.blueStones : puzzle.redStones;

        if (!opponentStones.includes(puzzle.lastMove)) {
            errors.push({ code: 'last_move_not_opponent', params: { move: puzzle.lastMove } });
        }
    }

    if (puzzle.tree.move !== undefined) {
        errors.push({ code: 'root_has_move', path: [] });
    }

    if (puzzle.tree.result !== undefined) {
        errors.push({ code: 'root_has_result', path: [] });
    }

    let nodesCount = 0;

    /**
     * Counts a node, returns false once limit is exceeded.
     */
    const countNode = (): boolean => {
        if (++nodesCount <= PUZZLE_MAX_NODES) {
            return true;
        }

        if (nodesCount === PUZZLE_MAX_NODES + 1) {
            errors.push({ code: 'too_many_nodes', params: { max: PUZZLE_MAX_NODES } });
        }

        return false;
    };

    type PositionedPath = {
        /**
         * Moves to reach the node.
         */
        path: Move[];

        /**
         * Parallel sequences roots playable from the node.
         */
        parallels: unknown[];
    };

    /**
     * Nodes having children or a result, by position, see getNodeKey().
     * Main sequence only, parallel sequences have no transpositions.
     */
    const definedPositions = new Map<string, PositionedPath>();

    /**
     * Main sequence leaves without result, by position: possible transpositions, checked once all defined nodes are known.
     */
    const leafPositions: (PositionedPath & { key: string })[] = [];

    /**
     * @param location Where this node is, in main or in a parallel sequence
     * @param isPlayerMove Whether this node is a player move, so computer answers next
     * @param ended Whether puzzle ended before this node (an ancestor has a result)
     * @param parallels Parallel sequences roots declared on ancestors, playable from this node
     */
    const checkNode = (node: Record<string, unknown>, occupied: Set<Move>, location: Location, isPlayerMove: boolean, ended: boolean, parallels: unknown[]): void => {
        const { path } = location;

        checkKeys(node, NODE_KEYS, location);
        checkMessage(node, location);

        if (node.result !== undefined && node.result !== 'solved' && node.result !== 'failed') {
            addError('invalid_result', location, { result: JSON.stringify(node.result) });
        }

        if (node.result !== undefined && ended) {
            addError('result_in_continuation', location);
        }

        if (location.parallel !== undefined) {
            // Parallel sequences are optional, so they cannot solve the puzzle
            if (node.result === 'solved') {
                addError('solved_in_parallel', location);
            }

            // Else, it would be player turn again after going back to main sequence
            if (isPlayerMove && !ended && !isDefinedNode(node)) {
                addError('parallel_missing_answer', location);
            }
        } else if (path.length > 0) {
            const key = getNodeKey(path, ended);

            if (!isDefinedNode(node)) {
                leafPositions.push({ key, path, parallels });
            } else if (!definedPositions.has(key)) {
                definedPositions.set(key, { path, parallels });
            } else {
                // Only one of them can be continued, other one should be a transposition leaf
                addError('duplicate_position', location, { other: definedPositions.get(key)!.path.join(' ') });
            }
        }

        if (node.parallel !== undefined) {
            checkParallels(node, occupied, location, isPlayerMove, ended);
        }

        const childrenParallels = Array.isArray(node.parallel) ? [...parallels, ...node.parallel] : parallels;

        checkChildren(node, occupied, location, isPlayerMove, ended || node.result !== undefined, childrenParallels);
    };

    /**
     * Checks parallel sequences declared on this node.
     */
    const checkParallels = (node: Record<string, unknown>, occupied: Set<Move>, location: Location, isPlayerMove: boolean, ended: boolean): void => {
        if (!Array.isArray(node.parallel)) {
            addError('parallel_not_list', location);
            return;
        }

        if (isPlayerMove) {
            addError('parallel_on_computer_move', location);
        }

        if (ended || node.result !== undefined) {
            addError('parallel_in_continuation', location);
        }

        if (location.parallel !== undefined) {
            addError('parallel_nested', location);
        } else if (!ended && !isDefinedNode(node)) {
            // Puzzle is solved when reaching this node, or it is a transposition continuing from another node:
            // parallel sequences could never be played
            addError('parallel_on_leaf', location);
        }

        const parallel: unknown[] = node.parallel;

        // Cells used by main sequence from this node, then also by each checked parallel sequence
        const usedCells = collectCells({ children: node.children });

        for (const [index, root] of parallel.entries()) {
            if (!countNode()) {
                return;
            }

            const rootLocation: Location = { path: location.path, parallel: { index, path: [] } };

            if (!isObject(root)) {
                addError('node_not_object', rootLocation);
                continue;
            }

            checkKeys(root, PARALLEL_ROOT_KEYS, rootLocation);

            if (root.children === undefined || (Array.isArray(root.children) && root.children.length === 0)) {
                addError('empty_parallel', rootLocation);
            } else {
                checkChildren(root, occupied, rootLocation, false, ended, []);
            }

            const cells = collectCells(root);
            const overlap = [...cells].find(cell => usedCells.has(cell));

            if (overlap !== undefined) {
                addError('parallel_overlap', rootLocation, { move: overlap });
            }

            cells.forEach(cell => usedCells.add(cell));
        }
    };

    /**
     * @param childrenEnded Whether puzzle ended before children
     */
    const checkChildren = (node: Record<string, unknown>, occupied: Set<Move>, location: Location, isPlayerMove: boolean, childrenEnded: boolean, parallels: unknown[]): void => {
        if (node.children === undefined) {
            return;
        }

        if (!Array.isArray(node.children)) {
            addError('children_not_list', location);
            return;
        }

        const children: unknown[] = node.children;

        if (isPlayerMove && children.length > 1) {
            addError('computer_one_answer', location, { count: children.length });
        }

        const seen = new Set<Move>();

        children.forEach((child, index) => {
            if (!countNode()) {
                return;
            }

            if (!isObject(child)) {
                addError('node_not_object', location);
                return;
            }

            const childErrorLocation: Location = { ...location, child: index };

            if ('else' in child) {
                if (isPlayerMove) {
                    addError('else_as_computer_answer', childErrorLocation);
                }

                if (childrenEnded) {
                    addError('else_in_continuation', childErrorLocation);
                }

                // Would also catch main sequence moves
                if (location.parallel !== undefined) {
                    addError('else_in_parallel', childErrorLocation);
                }

                if (index !== children.length - 1) {
                    addError('else_not_last', childErrorLocation);
                }

                checkKeys(child, ELSE_NODE_KEYS, childErrorLocation);
                checkMessage(child, childErrorLocation);

                if (child.result !== undefined && child.result !== 'failed') {
                    addError('else_always_failed', childErrorLocation);
                }

                // Can be same cell as an expected move: free when else applies, as player played elsewhere
                if (checkMove(child.else, childErrorLocation) && occupied.has(child.else)) {
                    addError('occupied', childErrorLocation, { move: child.else });
                }

                return;
            }

            if (!checkMove(child.move, childErrorLocation)) {
                return;
            }

            if (occupied.has(child.move)) {
                addError('occupied', childErrorLocation, { move: child.move });
                return;
            }

            if (seen.has(child.move)) {
                addError('set_twice', childErrorLocation, { move: child.move });
            }

            seen.add(child.move);

            checkNode(child, new Set([...occupied, child.move]), childLocation(location, child.move), !isPlayerMove, childrenEnded, parallels);
        });
    };

    checkNode(puzzle.tree, initialStones, { path: [] }, false, false, []);

    // Transposition would continue with other parallel sequences, not checked against continued subtree
    for (const { key, path, parallels } of leafPositions) {
        const target = definedPositions.get(key);

        if (target !== undefined && !sameItems(target.parallels, parallels)) {
            errors.push({ code: 'parallel_transposition', path, params: { other: target.path.join(' ') } });
        }
    }

    if (!Array.isArray(puzzle.tree.children) || puzzle.tree.children.length === 0) {
        errors.push({ code: 'empty_tree' });
    } else if (errors.length === 0 && !findSolution(puzzle.tree, createNodeResolver(puzzle.tree))?.length) {
        // Only on a valid tree, findSolution() expects it. Likely forgot to set which moves solve the puzzle
        errors.push({ code: 'no_solution' });
    }

    return errors;
};
