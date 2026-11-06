import type { HexMove, Move } from '@playhex/move-notation';
import type { SGF, SGFMove } from '../sgf/index.js';
import {
    applyNodeToPosition,
    canSwapAfter,
    createHexplorerPosition,
    createRootNodes,
    HEXPLORER_COMMENT_MAX_LENGTH,
    HEXPLORER_MARK_LABEL_MAX_LENGTH,
    isCellOnBoard,
    ROOT_ID,
    type HexplorerPosition,
    type MarkPlacement,
    type MarkType,
    type SetupStone,
    type TreeNode,
    type TreeNodeData,
} from './hexplorerStudy.js';

export const SGF_MARKS: [keyof SGFMove & ('TR' | 'CR' | 'SQ' | 'MA' | 'SL'), MarkType][] = [
    ['TR', 'triangle'],
    ['CR', 'circle'],
    ['SQ', 'square'],
    ['MA', 'cross'],
    ['SL', 'select'],
];

type Cursor = { id: number, position: HexplorerPosition };

/**
 * Reads all that SGF standard can hold into a Hexplorer tree:
 * variations, setup stones (AB, AW, AE, PL), marks and comments.
 *
 * SGF has more freedom than Hexplorer tree, so:
 *  - a setup or marks node is a setup node, holding all stones on board at this point
 *  - marks on a move node go on a setup node added after it
 *  - two moves of same color in a row get a setup node between them, to change color to play
 *  - a node with an illegal move stops its branch
 */
export const sgfToTreeNodes = (sgf: SGF, boardsize: number): TreeNode[] => {
    const nodes = createRootNodes();
    const root = nodes[0];

    const isOnBoard = (move: string): move is Move => isCellOnBoard(move, boardsize);

    /**
     * @returns Null if not a move on this board
     */
    const readHexMove = (move: string): null | HexMove => {
        if (move === '' || move === 'pass') return 'pass';
        if (move === 'swap-pieces') return move;

        return isOnBoard(move) ? move : null;
    };

    const addNode = (parentId: number, data: TreeNodeData, comment?: string): number => {
        const node: TreeNode = { id: nodes.length, parentId, children: [], data };

        if (comment) {
            node.comment = comment.slice(0, HEXPLORER_COMMENT_MAX_LENGTH);
        }

        nodes.push(node);
        nodes[parentId].children.push(node.id);

        return node.id;
    };

    const readMarks = (sgfNode: SGF | SGFMove): MarkPlacement[] => {
        const marks: MarkPlacement[] = [];

        for (const [property, type] of SGF_MARKS) {
            for (const move of sgfNode[property] ?? []) {
                if (isOnBoard(move)) {
                    marks.push({ move, type });
                }
            }
        }

        for (const label of sgfNode.LB ?? []) {
            const [move, text] = label.split(':');

            if (isOnBoard(move)) {
                marks.push({ move, type: 'label', text: (text ?? '').slice(0, HEXPLORER_MARK_LABEL_MAX_LENGTH) });
            }
        }

        return marks;
    };

    /**
     * Adds a setup node with stones of given position.
     */
    const addSetup = ({ id, position }: Cursor, nextPlayer: 0 | 1, marks: MarkPlacement[], comment?: string): Cursor => {
        const stones = [...position.stones].map(([move, color]): SetupStone => ({ move, color }));
        const data: TreeNodeData = { type: 'setup', stones, marks, nextPlayer };

        return { id: addNode(id, data, comment), position: applyNodeToPosition(position, data) };
    };

    const readMove = (sgfNode: SGFMove): null | { move: string, color: 0 | 1 } => {
        if (sgfNode.B !== undefined) return { move: sgfNode.B, color: 0 };
        if (sgfNode.W !== undefined) return { move: sgfNode.W, color: 1 };

        return null;
    };

    const addMove = (cursor: Cursor, played: { move: string, color: 0 | 1 }, sgfNode: SGFMove): null | Cursor => {
        const move = readHexMove(played.move);

        if (move === null || (move !== 'pass' && move !== 'swap-pieces' && cursor.position.stones.has(move))) {
            return null;
        }

        const sameColor = played.color === cursor.position.nextPlayer;

        // A setup node added for color or marks also starts a new line of moves
        if (move === 'swap-pieces' && (!sameColor || !canSwapAfter(nodes[cursor.id], id => nodes[id]))) {
            return null;
        }

        const from = sameColor ? cursor : addSetup(cursor, played.color, []);
        const data: TreeNodeData = { type: 'move', move };
        const next = { id: addNode(from.id, data, sgfNode.C), position: applyNodeToPosition(from.position, data) };
        const marks = readMarks(sgfNode);

        return marks.length > 0 ? addSetup(next, next.position.nextPlayer, marks) : next;
    };

    /**
     * Adds stones, marks or color change, if any.
     * Node with nothing to display only gives its comment to parent.
     */
    const addSetupOrComment = (cursor: Cursor, sgfNode: SGF | SGFMove): Cursor => {
        const { position } = cursor;
        const stones = new Map(position.stones);

        for (const move of sgfNode.AE ?? []) stones.delete(move as Move);
        for (const move of sgfNode.AB ?? []) if (isOnBoard(move)) stones.set(move, 0);
        for (const move of sgfNode.AW ?? []) if (isOnBoard(move)) stones.set(move, 1);

        const marks = readMarks(sgfNode);
        const nextPlayer = sgfNode.PL === undefined ? position.nextPlayer : sgfNode.PL === 'B' ? 0 : 1;
        const stonesChanged = stones.size !== position.stones.size
            || [...stones].some(([move, color]) => position.stones.get(move) !== color);

        if (stonesChanged || marks.length > 0 || nextPlayer !== position.nextPlayer) {
            return addSetup({ id: cursor.id, position: { ...position, stones } }, nextPlayer, marks, sgfNode.C);
        }

        if (sgfNode.C) {
            const node = nodes[cursor.id];

            node.comment = [node.comment, sgfNode.C].filter(Boolean).join('\n').slice(0, HEXPLORER_COMMENT_MAX_LENGTH);
        }

        return cursor;
    };

    const addLine = (from: Cursor, sgfNodes: SGFMove[]): void => {
        let cursor = from;

        for (const sgfNode of sgfNodes) {
            const played = readMove(sgfNode);
            const next = played === null ? addSetupOrComment(cursor, sgfNode) : addMove(cursor, played, sgfNode);

            // After this node, to keep main line as first child
            for (const variation of sgfNode.variations ?? []) {
                addLine(cursor, variation);
            }

            if (next === null) {
                return;
            }

            cursor = next;
        }
    };

    if (sgf.C) {
        root.comment = sgf.C.slice(0, HEXPLORER_COMMENT_MAX_LENGTH);
    }

    addLine(addSetupOrComment({ id: ROOT_ID, position: createHexplorerPosition() }, { ...sgf, C: undefined }), sgf.moves ?? []);

    return nodes;
};
