import { SGF, SGFMove } from '../../../shared/sgf/types.js';
import { GameTree, ROOT_ID, TreeNode } from './GameTree.js';
import { MarkType } from './BoardMarksLayer.js';
import { getHexplorerPositionAt } from '../../../shared/app/hexplorerStudy.js';
import { SGF_MARKS } from '../../../shared/app/hexplorerSgf.js';

const MARK_TYPE_TO_SGF = {
    ...Object.fromEntries(SGF_MARKS.map(([property, type]) => [type, property])),
    label: 'LB',
} as Record<MarkType, 'TR' | 'CR' | 'SQ' | 'MA' | 'SL' | 'LB'>;

const nodeToSgfMove = (tree: GameTree, node: TreeNode): SGFMove => {
    const sgfMove: SGFMove = {};

    if (node.comment) {
        sgfMove.C = node.comment;
    }

    if (node.data === null) {
        return sgfMove;
    }

    if (node.data.type === 'move') {
        if (tree.getMoveColor(node.id) === 0) {
            sgfMove.B = node.data.move;
        } else {
            sgfMove.W = node.data.move;
        }

        return sgfMove;
    }

    // Setup node holds all stones, but in SGF they are added to stones already on board
    const { stones: previous } = getHexplorerPositionAt(tree.nodes.value, node.parentId as number);
    const added = node.data.stones.filter(({ move, color }) => previous.get(move) !== color);
    const black = added.filter(stone => stone.color === 0).map(stone => stone.move);
    const white = added.filter(stone => stone.color === 1).map(stone => stone.move);
    const kept = new Set(node.data.stones.map(stone => stone.move));
    const removed = [...previous.keys()].filter(move => !kept.has(move));

    sgfMove.PL = node.data.nextPlayer === 0 ? 'B' : 'W';

    if (black.length > 0) {
        sgfMove.AB = black;
    }

    if (white.length > 0) {
        sgfMove.AW = white;
    }

    if (removed.length > 0) {
        sgfMove.AE = removed;
    }

    for (const mark of node.data.marks) {
        const key = MARK_TYPE_TO_SGF[mark.type];
        const value = mark.type === 'label' ? `${mark.move}:${mark.text ?? ''}` : mark.move;

        (sgfMove[key] ??= []).push(value);
    }

    return sgfMove;
};

/**
 * Recursively builds the SGFMove sequence for the main line starting at parentId's first child,
 * attaching the other children as variations on that first child's own SGFMove object
 * (see writeNodesRecursive in src/shared/sgf/serializer.ts: a node's `.variations`
 * represents its siblings, rendered as separate parenthesized groups).
 */
const buildSgfMoves = (tree: GameTree, parentId: number): SGFMove[] => {
    const parent = tree.getNode(parentId);

    if (parent.children.length === 0) {
        return [];
    }

    const [firstChildId, ...siblingIds] = parent.children;
    const firstMove = nodeToSgfMove(tree, tree.getNode(firstChildId));

    if (siblingIds.length > 0) {
        firstMove.variations = siblingIds.map(siblingId => [
            nodeToSgfMove(tree, tree.getNode(siblingId)),
            ...buildSgfMoves(tree, siblingId),
        ]);
    }

    return [firstMove, ...buildSgfMoves(tree, firstChildId)];
};

export const gameTreeToSgf = (
    tree: GameTree,
    boardsize: number,
    playerBlackName?: string,
    playerWhiteName?: string,
): SGF => {
    const sgf: SGF = {
        FF: 4,
        GM: 11, // Hex
        SZ: boardsize,
        AP: 'PlayHex:1.0.0',
        moves: buildSgfMoves(tree, ROOT_ID),
    };

    const rootComment = tree.getNode(ROOT_ID).comment;

    if (rootComment) {
        sgf.C = rootComment;
    }

    if (playerBlackName) {
        sgf.PB = playerBlackName;
    }

    if (playerWhiteName) {
        sgf.PW = playerWhiteName;
    }

    return sgf;
};
