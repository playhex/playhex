/*
 * Short text to mention a tree node in chat, i.e "12.e5":
 * move number (tree column) and move.
 * Readable without clicking, and no translation needed.
 * Ctrl+click on a tree node pastes it in chat, then clicking it in a message selects the node.
 */
import { GameTree, ROOT_ID, type TreeNode } from './GameTree.js';
import { replaceOutsideLinks } from '../../../shared/app/chatUtils.js';

/**
 * Column of the node in the tree: root is 0, first move is 1.
 */
const getNodeDepth = (tree: GameTree, id: number): number => tree.getPath(id).length - 1;

const nodeMoveLabel = (node: TreeNode): null | string => {
    const { data } = node;

    if (data === null) {
        return null;
    }

    if (data.type === 'setup') {
        return 'setup';
    }

    switch (data.move) {
        case 'pass': return 'pass';
        case 'swap-pieces': return 'swap';
        default: return data.move;
    }
};

/**
 * "12.e5", "3.swap", "1.setup"... Null for root.
 */
export const nodeMentionLabel = (tree: GameTree, id: number): null | string => {
    const moveLabel = nodeMoveLabel(tree.getNode(id));

    if (moveLabel === null) {
        return null;
    }

    return `${getNodeDepth(tree, id)}.${moveLabel}`;
};

/**
 * Node mentioned by "12.e5".
 * Several nodes can match when different branches play same move at same move number:
 * prefer the one on current line (ancestors of current node, then its first children),
 * else first one in tree order (first branches first).
 *
 * @returns Node id, or null if no node matches (i.e deleted since).
 */
export const resolveNodeMention = (tree: GameTree, mention: string, currentNodeId: number): null | number => {
    const separator = mention.indexOf('.');

    if (separator < 1) {
        return null;
    }

    const depth = parseInt(mention.substring(0, separator), 10);
    const moveLabel = mention.substring(separator + 1);

    if (!Number.isInteger(depth) || depth < 1) {
        return null;
    }

    const matches = (node: TreeNode): boolean => nodeMoveLabel(node) === moveLabel;

    // Current line
    const currentLine = tree.getPath(currentNodeId);

    while (currentLine.length <= depth) {
        const { children } = currentLine[currentLine.length - 1];

        if (children.length === 0) {
            break;
        }

        currentLine.push(tree.getNode(children[0]));
    }

    if (depth < currentLine.length && matches(currentLine[depth])) {
        return currentLine[depth].id;
    }

    // Else first match in tree order
    const walk = (nodeId: number, nodeDepth: number): null | number => {
        const current = tree.getNode(nodeId);

        if (nodeDepth === depth) {
            return matches(current) ? current.id : null;
        }

        for (const childId of current.children) {
            const found = walk(childId, nodeDepth + 1);

            if (found !== null) {
                return found;
            }
        }

        return null;
    };

    return walk(ROOT_ID, 0);
};

/**
 * Wraps node mentions of a sanitized chat message in a clickable span,
 * same look as clickable coords.
 * Do not match inside urls or links.
 *
 * Example:
 *      "12.e5 is better"
 *  =>  '<span class="coords" data-node-mention="12.e5">12.e5</span> is better'
 */
export const makeNodeMentionsInteractive = (str: string): string => replaceOutsideLinks(
    str,
    /\b\d{1,3}\.(?:[a-z]{1,2}\d{1,3}|swap|pass|setup)\b/,
    mention => `<span class="coords" data-node-mention="${mention.toLowerCase()}">${mention}</span>`,
);
