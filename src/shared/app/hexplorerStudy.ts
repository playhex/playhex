import { mirrorCoords, coordsToMove, parseMove, validateMove, type HexMove, type Move } from '@playhex/move-notation';
import { isValidBoardsize } from './boardsizeLimits.js';

export const HEXPLORER_STUDY_TITLE_MAX_LENGTH = 64;
export const HEXPLORER_STUDY_MAX_NODES = 5000;
export const HEXPLORER_STUDY_MAX_BYTES = 4 * 1024 * 1024;
export const HEXPLORER_STUDIES_PAGE_SIZE = 20;
export const HEXPLORER_COMMENT_MAX_LENGTH = 2000;
export const HEXPLORER_PLAYER_NAME_MAX_LENGTH = 64;
export const HEXPLORER_MARK_LABEL_MAX_LENGTH = 3;

const MARK_TYPES = ['cross', 'triangle', 'square', 'circle', 'select', 'label'] as const;

export type MarkType = typeof MARK_TYPES[number];

export type MarkPlacement = { move: Move, type: MarkType, text?: string };

export type SetupStone = { move: Move, color: 0 | 1 };

export type TreeNodeData =
    | { type: 'move', move: HexMove }
    | { type: 'setup', stones: SetupStone[], marks: MarkPlacement[], nextPlayer: 0 | 1 }
;

export type TreeNode = {
    id: number;
    parentId: number | null;
    children: number[];
    data: TreeNodeData | null; // null only for the root (empty board)
    comment?: string;
};

export const ROOT_ID = 0;

/**
 * Initial node list of a fresh tree: just the (empty board) root.
 * Used to seed the state that backs a GameTree.
 */
export const createRootNodes = (): TreeNode[] => [{
    id: ROOT_ID,
    parentId: null,
    children: [],
    data: null,
}];

/**
 * A single line of moves from root.
 */
export const movesToTreeNodes = (moves: HexMove[]): TreeNode[] => {
    const nodes = createRootNodes();

    moves.forEach((move, index) => {
        nodes[index].children.push(index + 1);
        nodes.push({ id: index + 1, parentId: index, children: [], data: { type: 'move', move } });
    });

    return nodes;
};

/**
 * Raw, plain state shared between useHexplorer and the tools.
 * Kept as a POJO wrapped in a single ref so tools can mutate
 * it directly and have changes stay reactive.
 *
 * Fully JSON-serializable, so it doubles as the download/restore format
 * of a whole analysis (board size, move tree and current position included),
 * and as the content of a HexplorerStudy.
 */
export type HexplorerState = {
    setupMode: boolean;
    currentPlayer: 0 | 1;
    playerBlackName?: string;
    playerWhiteName?: string;

    // Per-color [red, blue] settings, applied when it's this color's turn.
    // autoPlay: play the analyzer's recommended move automatically.
    // winrateEnabled: show the whiteWin bar.
    // policyEnabled: show the policy layer.
    autoPlay: [boolean, boolean];
    winrateEnabled: [boolean, boolean];
    policyEnabled: [boolean, boolean];
    policyShowNumbers: boolean;
    policyShowBestMark: boolean;

    // Name of the selected analysis engine. Restored only if still available.
    analyzerName?: string;

    // Board size, move tree and current position, kept live in the state (the GameView,
    // GameTree and currentNodeId are views/mirrors of these), so the whole analysis
    // round-trips by simply serializing/restoring this single object.
    boardsize: number;
    currentNodeId: number;
    nodes: TreeNode[];
};

export const createHexplorerState = (boardsize = 11): HexplorerState => ({
    setupMode: false,
    currentPlayer: 0,
    autoPlay: [false, false],
    winrateEnabled: [true, true],
    policyEnabled: [true, true],
    policyShowNumbers: false,
    policyShowBestMark: false,
    boardsize,
    currentNodeId: ROOT_ID,
    nodes: createRootNodes(),
});

export class InvalidHexplorerStateError extends Error {}

const fail = (message: string): never => {
    throw new InvalidHexplorerStateError(`Invalid Hexplorer analysis: ${message}`);
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isPlayerIndex = (value: unknown): value is 0 | 1 => value === 0 || value === 1;

export const isCellOnBoard = (cell: string, boardsize: number): cell is Move => {
    if (!validateMove(cell)) {
        return false;
    }

    const { row, col } = parseMove(cell);

    return row >= 0 && col >= 0 && row < boardsize && col < boardsize;
};

const parseCell = (value: unknown, boardsize: number): Move => {
    if (typeof value !== 'string' || !isCellOnBoard(value, boardsize)) {
        return fail(`invalid cell ${String(value)}`);
    }

    return value;
};

const parseMark = (value: unknown, boardsize: number): MarkPlacement => {
    if (!isObject(value) || !MARK_TYPES.includes(value.type as MarkType)) {
        return fail('invalid mark');
    }

    const mark: MarkPlacement = { move: parseCell(value.move, boardsize), type: value.type as MarkType };

    if (value.text !== undefined && value.text !== null) {
        if (typeof value.text !== 'string' || value.text.length > HEXPLORER_MARK_LABEL_MAX_LENGTH) {
            return fail('invalid mark label');
        }

        mark.text = value.text;
    }

    return mark;
};

const parseNodeData = (value: unknown, boardsize: number): TreeNodeData => {
    if (!isObject(value)) {
        return fail('invalid node data');
    }

    if (value.type === 'move') {
        const move = value.move === 'pass' || value.move === 'swap-pieces'
            ? value.move
            : parseCell(value.move, boardsize)
        ;

        return { type: 'move', move };
    }

    if (value.type !== 'setup' || !Array.isArray(value.stones) || !isPlayerIndex(value.nextPlayer)) {
        return fail('invalid node data');
    }

    const stones = value.stones.map((stone: unknown): SetupStone => {
        if (!isObject(stone) || !isPlayerIndex(stone.color)) {
            return fail('invalid setup stone');
        }

        return { move: parseCell(stone.move, boardsize), color: stone.color };
    });

    const marks = Array.isArray(value.marks) ? value.marks.map(mark => parseMark(mark, boardsize)) : [];

    return { type: 'setup', stones, marks, nextPlayer: value.nextPlayer };
};

const parseNode = (value: unknown, boardsize: number): TreeNode => {
    if (
        !isObject(value)
        || !Number.isInteger(value.id)
        || !(value.parentId === null || Number.isInteger(value.parentId))
        || !Array.isArray(value.children)
        || !value.children.every(child => Number.isInteger(child))
    ) {
        return fail('invalid node');
    }

    const node: TreeNode = {
        id: value.id as number,
        parentId: value.parentId as null | number,
        children: value.children as number[],
        data: value.data === null ? null : parseNodeData(value.data, boardsize),
    };

    if (value.comment !== undefined) {
        if (typeof value.comment !== 'string' || value.comment.length > HEXPLORER_COMMENT_MAX_LENGTH) {
            return fail('invalid comment');
        }

        if (value.comment !== '') {
            node.comment = value.comment;
        }
    }

    return node;
};

/**
 * Whether a swap can be played after given node: a line of moves starts from root
 * or from a setup node, and only its first stone can be swapped.
 */
export const canSwapAfter = (node: TreeNode, getNode: (id: number) => undefined | TreeNode): boolean => {
    if (node.data?.type !== 'move' || node.data.move === 'pass' || node.data.move === 'swap-pieces') {
        return false;
    }

    return getNode(node.parentId as number)?.data?.type !== 'move';
};

/**
 * Checks that nodes are a single tree: from root, every node is reached
 * exactly once, agrees with its parent, and can be replayed.
 */
const checkTree = (nodes: TreeNode[]): void => {
    const nodesById = new Map(nodes.map(node => [node.id, node]));

    if (nodesById.size !== nodes.length) {
        fail('duplicate node id');
    }

    const root = nodesById.get(ROOT_ID);

    if (root === undefined || root.parentId !== null || root.data !== null) {
        fail('invalid root');
    }

    const reached = new Set<number>([ROOT_ID]);
    const stack = [ROOT_ID];

    while (stack.length > 0) {
        const parentId = stack.pop() as number;
        const parent = nodesById.get(parentId) as TreeNode;

        for (const childId of parent.children) {
            const child = nodesById.get(childId);

            if (child === undefined || child.parentId !== parentId || child.data === null || reached.has(childId)) {
                fail(`invalid node ${childId}`);
            }

            if (child?.data?.type === 'move' && child.data.move === 'swap-pieces' && !canSwapAfter(parent, id => nodesById.get(id))) {
                fail(`illegal swap at node ${childId}`);
            }

            reached.add(childId);
            stack.push(childId);
        }
    }

    if (reached.size !== nodes.length) {
        fail('some nodes are not attached to the tree');
    }
};

const parseBooleanPair = (value: unknown, defaultValue: [boolean, boolean]): [boolean, boolean] => {
    if (value === undefined) {
        return defaultValue;
    }

    if (!Array.isArray(value) || value.length !== 2 || !value.every(item => typeof item === 'boolean')) {
        return fail('invalid settings');
    }

    return value as [boolean, boolean];
};

/**
 * Too long names are truncated: they may come from an imported game.
 */
const parseOptionalName = (value: unknown): undefined | string => {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'string') {
        return fail('invalid name');
    }

    return value.slice(0, HEXPLORER_PLAYER_NAME_MAX_LENGTH);
};

/**
 * Builds a clean state from untrusted data (json file, api body).
 * Only known fields are kept, and missing settings get their default value,
 * so analyses saved by a previous version can still be loaded.
 *
 * @param maxNodes Only limited on what is stored: a big analysis can still be opened from a file
 *
 * @throws {InvalidHexplorerStateError}
 */
export const parseHexplorerState = (data: unknown, maxNodes = Infinity): HexplorerState => {
    if (!isObject(data) || typeof data.boardsize !== 'number' || !isValidBoardsize(data.boardsize) || !Array.isArray(data.nodes)) {
        return fail('missing board size or nodes');
    }

    if (data.nodes.length > maxNodes) {
        return fail(`too many nodes, ${maxNodes} max`);
    }

    const { boardsize } = data;
    const nodes = data.nodes.map(node => parseNode(node, boardsize));

    checkTree(nodes);

    const defaults = createHexplorerState(boardsize);
    const state: HexplorerState = {
        ...defaults,
        currentPlayer: isPlayerIndex(data.currentPlayer) ? data.currentPlayer : defaults.currentPlayer,
        autoPlay: parseBooleanPair(data.autoPlay, defaults.autoPlay),
        winrateEnabled: parseBooleanPair(data.winrateEnabled, defaults.winrateEnabled),
        policyEnabled: parseBooleanPair(data.policyEnabled, defaults.policyEnabled),
        policyShowNumbers: data.policyShowNumbers === true,
        policyShowBestMark: data.policyShowBestMark === true,
        currentNodeId: nodes.some(node => node.id === data.currentNodeId) ? data.currentNodeId as number : ROOT_ID,
        nodes,
    };

    const playerBlackName = parseOptionalName(data.playerBlackName);
    const playerWhiteName = parseOptionalName(data.playerWhiteName);
    const analyzerName = parseOptionalName(data.analyzerName);

    if (playerBlackName !== undefined) state.playerBlackName = playerBlackName;
    if (playerWhiteName !== undefined) state.playerWhiteName = playerWhiteName;
    if (analyzerName !== undefined) state.analyzerName = analyzerName;

    return state;
};

/**
 * Stones on board at a given node, without needing a board or a game engine.
 */
export type HexplorerPosition = {
    stones: Map<Move, 0 | 1>;
    nextPlayer: 0 | 1;
    lastMove: null | Move;
};

export const createHexplorerPosition = (): HexplorerPosition => ({
    stones: new Map(),
    nextPlayer: 0,
    lastMove: null,
});

/**
 * Position after given node. Setup nodes hold all stones on board.
 * A move on an occupied cell is ignored, nodes are expected to come from a played tree.
 */
export const applyNodeToPosition = (position: HexplorerPosition, data: null | TreeNodeData): HexplorerPosition => {
    if (data === null) {
        return position;
    }

    if (data.type === 'setup') {
        return {
            stones: new Map(data.stones.map(({ move, color }) => [move, color])),
            nextPlayer: data.nextPlayer,
            lastMove: null,
        };
    }

    const stones = new Map(position.stones);
    const nextPlayer = 1 - position.nextPlayer as 0 | 1;
    let { lastMove } = position;

    if (data.move === 'swap-pieces') {
        const swapped = [...stones.keys()];

        if (swapped.length === 1) {
            lastMove = coordsToMove(mirrorCoords(parseMove(swapped[0])));
            stones.clear();
            stones.set(lastMove, position.nextPlayer);
        }
    } else if (data.move !== 'pass' && !stones.has(data.move)) {
        stones.set(data.move, position.nextPlayer);
        lastMove = data.move;
    }

    return { stones, nextPlayer, lastMove };
};

/**
 * Replays tree from root to given node.
 */
export const getHexplorerPositionAt = (nodes: TreeNode[], nodeId: number): HexplorerPosition => {
    const nodesById = new Map(nodes.map(node => [node.id, node]));
    const path: TreeNode[] = [];

    for (let node = nodesById.get(nodeId); node !== undefined; node = node.parentId === null ? undefined : nodesById.get(node.parentId)) {
        path.unshift(node);
    }

    return path.reduce((position, node) => applyNodeToPosition(position, node.data), createHexplorerPosition());
};

/**
 * Sent to create or update a study.
 *
 * forkedFromPublicId: study this one is forked from, only used on creation.
 */
export type HexplorerStudyInput = {
    title: null | string;
    data: HexplorerState;
    forkedFromPublicId?: string;
};
