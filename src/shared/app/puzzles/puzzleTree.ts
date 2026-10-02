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

/**
 * Checks that puzzle is consistent: moves inside board,
 * no move on an occupied cell, computer has at most one answer...
 * Also checks types and sizes, as puzzle can come from user input.
 *
 * @returns List of errors, empty if puzzle is valid.
 */
export const validatePuzzle = (puzzle: PuzzleDefinition): string[] => {
    const errors: string[] = [];
    const { boardsize } = puzzle;

    if (!Number.isInteger(boardsize) || boardsize < MIN_BOARDSIZE || boardsize > MAX_BOARDSIZE) {
        return [`Invalid boardsize: ${boardsize}`];
    }

    if (puzzle.title != null && (typeof puzzle.title !== 'string' || puzzle.title.length > PUZZLE_TITLE_MAX_LENGTH)) {
        errors.push(`Title must have at most ${PUZZLE_TITLE_MAX_LENGTH} characters`);
    }

    if (puzzle.description != null && (typeof puzzle.description !== 'string' || puzzle.description.length > PUZZLE_DESCRIPTION_MAX_LENGTH)) {
        errors.push(`Description must have at most ${PUZZLE_DESCRIPTION_MAX_LENGTH} characters`);
    }

    if (puzzle.playerColor !== 0 && puzzle.playerColor !== 1) {
        errors.push(`Invalid player color: ${String(puzzle.playerColor)}`);
    }

    if (!Array.isArray(puzzle.redStones) || !Array.isArray(puzzle.blueStones)) {
        return [...errors, 'Initial stones must be lists of moves'];
    }

    if (!isObject(puzzle.tree)) {
        return [...errors, 'Tree must be an object'];
    }

    const checkMove = (move: unknown, where: string): move is Move => {
        if (typeof move !== 'string' || !validateMove(move)) {
            errors.push(`${where}: invalid move "${String(move)}"`);
            return false;
        }

        if (!isInBoard(move, boardsize)) {
            errors.push(`${where}: move "${move}" is outside the board`);
            return false;
        }

        return true;
    };

    const checkMessage = (node: Record<string, unknown>, where: string): void => {
        if (node.message == null) {
            return;
        }

        if (typeof node.message !== 'string' || node.message.length > PUZZLE_MESSAGE_MAX_LENGTH) {
            errors.push(`${where}: message must have at most ${PUZZLE_MESSAGE_MAX_LENGTH} characters`);
        }
    };

    const checkKeys = (node: Record<string, unknown>, allowedKeys: string[], where: string): void => {
        for (const key of Object.keys(node)) {
            if (!allowedKeys.includes(key)) {
                errors.push(`${where}: unexpected property "${key}"`);
            }
        }
    };

    const initialStones = new Set<Move>();

    for (const move of [...puzzle.redStones, ...puzzle.blueStones]) {
        if (!checkMove(move, 'Initial stones')) {
            continue;
        }

        if (initialStones.has(move)) {
            errors.push(`Initial stones: "${move}" is set twice`);
        }

        initialStones.add(move);
    }

    if (puzzle.lastMove) {
        const opponentStones = puzzle.playerColor === 0 ? puzzle.blueStones : puzzle.redStones;

        if (!opponentStones.includes(puzzle.lastMove)) {
            errors.push(`Last move "${puzzle.lastMove}" must be one of initial ${puzzle.playerColor === 0 ? 'blue' : 'red'} stones, opponent of player`);
        }
    }

    if (puzzle.tree.move !== undefined) {
        errors.push('Root node must not have a move');
    }

    if (puzzle.tree.result !== undefined) {
        errors.push('Root node must not have a result');
    }

    let nodesCount = 0;

    /**
     * @param path Moves played to reach this node, used in error messages
     * @param isPlayerMove Whether this node is a player move, so computer answers next
     * @param ended Whether puzzle ended before this node (an ancestor has a result)
     */
    const checkNode = (node: Record<string, unknown>, occupied: Set<Move>, path: string[], isPlayerMove: boolean, ended: boolean): void => {
        const where = `After "${path.join(' ') || 'root'}"`;

        checkKeys(node, NODE_KEYS, where);
        checkMessage(node, where);

        if (node.result !== undefined && node.result !== 'solved' && node.result !== 'failed') {
            errors.push(`${where}: invalid result ${JSON.stringify(node.result)}`);
        }

        if (node.result !== undefined && ended) {
            errors.push(`${where}: puzzle already ended, a continuation must not have a result`);
        }

        if (node.children === undefined) {
            return;
        }

        if (!Array.isArray(node.children)) {
            errors.push(`${where}: children must be a list`);
            return;
        }

        const children: unknown[] = node.children;
        const childrenEnded = ended || node.result !== undefined;

        if (isPlayerMove && children.length > 1) {
            errors.push(`${where}: computer must have only one answer, got ${children.length}`);
        }

        const seen = new Set<Move>();

        children.forEach((child, index) => {
            if (++nodesCount > PUZZLE_MAX_NODES) {
                if (nodesCount === PUZZLE_MAX_NODES + 1) {
                    errors.push(`Tree must have at most ${PUZZLE_MAX_NODES} nodes`);
                }

                return;
            }

            if (!isObject(child)) {
                errors.push(`${where}: node must be an object`);
                return;
            }

            if ('else' in child) {
                const elseWhere = `${where}, else`;

                if (isPlayerMove) {
                    errors.push(`${elseWhere}: computer answer cannot be an "else" node`);
                }

                if (childrenEnded) {
                    errors.push(`${elseWhere}: puzzle already ended, a continuation must not have an "else" node`);
                }

                if (index !== children.length - 1) {
                    errors.push(`${elseWhere}: "else" node must be the last one`);
                }

                checkKeys(child, ELSE_NODE_KEYS, elseWhere);
                checkMessage(child, elseWhere);

                if (child.result !== undefined && child.result !== 'failed') {
                    errors.push(`${elseWhere}: "else" node is always failed`);
                }

                // Can be same cell as an expected move: free when else applies, as player played elsewhere
                if (checkMove(child.else, elseWhere) && occupied.has(child.else)) {
                    errors.push(`${elseWhere}: "${child.else}" is already occupied`);
                }

                return;
            }

            if (!checkMove(child.move, where)) {
                return;
            }

            if (occupied.has(child.move)) {
                errors.push(`${where}: "${child.move}" is already occupied`);
                return;
            }

            if (seen.has(child.move)) {
                errors.push(`${where}: "${child.move}" is set twice`);
            }

            seen.add(child.move);

            checkNode(child, new Set([...occupied, child.move]), [...path, child.move], !isPlayerMove, childrenEnded);
        });
    };

    checkNode(puzzle.tree, initialStones, [], false, false);

    return errors;
};
