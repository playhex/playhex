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
 * Nodes to reach from this node to solve the puzzle, player moves and computer answers,
 * following first winning player move at each step.
 * Returns empty list if node is already solved, or null if puzzle cannot be solved from this node.
 *
 * @param isPlayerMove Whether this node is a player move, so computer answers next
 */
export const findSolution = (node: PuzzleNode, isPlayerMove = false): null | PuzzleNode[] => {
    const result = getNodeResult(node);

    if (result !== null) {
        return result === 'solved' ? [] : null;
    }

    const candidates: PuzzleNode[] = isPlayerMove
        ? [getComputerAnswer(node)].filter(answer => answer !== null)
        : node.children!.filter(child => !isElseNode(child))
    ;

    for (const child of candidates) {
        const solution = findSolution(child, !isPlayerMove);

        if (solution !== null) {
            return [child, ...solution];
        }
    }

    return null;
};

const isInBoard = (move: Move, boardsize: number): boolean => {
    const { row, col } = parseMove(move);

    return row >= 0 && col >= 0 && row < boardsize && col < boardsize;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const NODE_KEYS = ['move', 'message', 'result', 'children'];
const ELSE_NODE_KEYS = ['else', 'message', 'result'];

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
;

/**
 * Validation error, as a code to translate on client side,
 * see "puzzles.errors" translations.
 */
export type PuzzleError = {
    code: PuzzleErrorCode;

    /**
     * Moves played to reach the tree node where the error is, empty for root.
     * Undefined when error is not in tree.
     */
    path?: Move[];

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
 * Not translated, for server side error messages.
 */
export const puzzleErrorToString = ({ code, path, params }: PuzzleError): string =>
    [
        code,
        path === undefined ? null : `after "${path.join(' ') || 'root'}"`,
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
     * Error at this path, or not in tree when path is undefined.
     */
    const addError = (code: PuzzleErrorCode, path: undefined | Move[], params: PuzzleError['params']): void => {
        errors.push(path === undefined ? { code, params } : { code, path, params });
    };

    /**
     * @param path Undefined when text is not in tree
     */
    const checkText = (value: unknown, property: string, maxLength: number, tooLongCode: PuzzleErrorCode, path?: Move[]): void => {
        if (value == null) {
            return;
        }

        if (typeof value !== 'string') {
            addError('invalid_type', path, { property });
        } else if (value.length > maxLength) {
            addError(tooLongCode, path, { max: maxLength });
        }
    };

    checkText(puzzle.title, 'title', PUZZLE_TITLE_MAX_LENGTH, 'title_too_long');
    checkText(puzzle.description, 'description', PUZZLE_DESCRIPTION_MAX_LENGTH, 'description_too_long');

    if (puzzle.playerColor !== 0 && puzzle.playerColor !== 1) {
        errors.push({ code: 'invalid_player_color', params: { color: String(puzzle.playerColor) } });
    }

    if (!Array.isArray(puzzle.redStones) || !Array.isArray(puzzle.blueStones)) {
        return [...errors, { code: 'invalid_stones' }];
    }

    if (!isObject(puzzle.tree)) {
        return [...errors, { code: 'invalid_tree' }];
    }

    /**
     * @param path Undefined for initial stones
     */
    const checkMove = (move: unknown, path?: Move[]): move is Move => {
        if (typeof move !== 'string' || !validateMove(move)) {
            addError('invalid_move', path, { move: String(move) });
            return false;
        }

        if (!isInBoard(move, boardsize)) {
            addError('outside_board', path, { move });
            return false;
        }

        return true;
    };

    const checkMessage = (node: Record<string, unknown>, path: Move[]): void =>
        checkText(node.message, 'message', PUZZLE_MESSAGE_MAX_LENGTH, 'message_too_long', path);

    const checkKeys = (node: Record<string, unknown>, allowedKeys: string[], path: Move[]): void => {
        for (const key of Object.keys(node)) {
            if (!allowedKeys.includes(key)) {
                errors.push({ code: 'unexpected_property', path, params: { property: key } });
            }
        }
    };

    const initialStones = new Set<Move>();

    for (const move of [...puzzle.redStones, ...puzzle.blueStones]) {
        if (!checkMove(move)) {
            continue;
        }

        if (initialStones.has(move)) {
            errors.push({ code: 'set_twice', params: { move } });
        }

        initialStones.add(move);
    }

    if (puzzle.redStones.length + puzzle.blueStones.length === 0) {
        errors.push({ code: 'empty_position' });
    }

    if (puzzle.lastMove != null && checkMove(puzzle.lastMove)) {
        const opponentStones = puzzle.playerColor === 0 ? puzzle.blueStones : puzzle.redStones;

        if (!opponentStones.includes(puzzle.lastMove)) {
            errors.push({ code: 'last_move_not_opponent', params: { move: puzzle.lastMove } });
        }
    }

    if (puzzle.tree.move !== undefined) {
        errors.push({ code: 'root_has_move' });
    }

    if (puzzle.tree.result !== undefined) {
        errors.push({ code: 'root_has_result' });
    }

    let nodesCount = 0;

    /**
     * @param path Moves played to reach this node
     * @param isPlayerMove Whether this node is a player move, so computer answers next
     * @param ended Whether puzzle ended before this node (an ancestor has a result)
     */
    const checkNode = (node: Record<string, unknown>, occupied: Set<Move>, path: Move[], isPlayerMove: boolean, ended: boolean): void => {
        checkKeys(node, NODE_KEYS, path);
        checkMessage(node, path);

        if (node.result !== undefined && node.result !== 'solved' && node.result !== 'failed') {
            errors.push({ code: 'invalid_result', path, params: { result: JSON.stringify(node.result) } });
        }

        if (node.result !== undefined && ended) {
            errors.push({ code: 'result_in_continuation', path });
        }

        if (node.children === undefined) {
            return;
        }

        if (!Array.isArray(node.children)) {
            errors.push({ code: 'children_not_list', path });
            return;
        }

        const children: unknown[] = node.children;
        const childrenEnded = ended || node.result !== undefined;

        if (isPlayerMove && children.length > 1) {
            errors.push({ code: 'computer_one_answer', path, params: { count: children.length } });
        }

        const seen = new Set<Move>();

        children.forEach((child, index) => {
            if (++nodesCount > PUZZLE_MAX_NODES) {
                if (nodesCount === PUZZLE_MAX_NODES + 1) {
                    errors.push({ code: 'too_many_nodes', params: { max: PUZZLE_MAX_NODES } });
                }

                return;
            }

            if (!isObject(child)) {
                errors.push({ code: 'node_not_object', path });
                return;
            }

            if ('else' in child) {
                if (isPlayerMove) {
                    errors.push({ code: 'else_as_computer_answer', path });
                }

                if (childrenEnded) {
                    errors.push({ code: 'else_in_continuation', path });
                }

                if (index !== children.length - 1) {
                    errors.push({ code: 'else_not_last', path });
                }

                checkKeys(child, ELSE_NODE_KEYS, path);
                checkMessage(child, path);

                if (child.result !== undefined && child.result !== 'failed') {
                    errors.push({ code: 'else_always_failed', path });
                }

                // Can be same cell as an expected move: free when else applies, as player played elsewhere
                if (checkMove(child.else, path) && occupied.has(child.else)) {
                    errors.push({ code: 'occupied', path, params: { move: child.else } });
                }

                return;
            }

            if (!checkMove(child.move, path)) {
                return;
            }

            if (occupied.has(child.move)) {
                errors.push({ code: 'occupied', path, params: { move: child.move } });
                return;
            }

            if (seen.has(child.move)) {
                errors.push({ code: 'set_twice', path, params: { move: child.move } });
            }

            seen.add(child.move);

            checkNode(child, new Set([...occupied, child.move]), [...path, child.move], !isPlayerMove, childrenEnded);
        });
    };

    checkNode(puzzle.tree, initialStones, [], false, false);

    if (!Array.isArray(puzzle.tree.children) || puzzle.tree.children.length === 0) {
        errors.push({ code: 'empty_tree' });
    } else if (errors.length === 0 && !findSolution(puzzle.tree)?.length) {
        // Only on a valid tree, findSolution() expects it. Likely forgot to set which moves solve the puzzle
        errors.push({ code: 'no_solution' });
    }

    return errors;
};
