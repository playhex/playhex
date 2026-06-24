import { ref, Ref } from 'vue';
import { HexMove } from '../../../shared/move-notation/hex-move-notation.js';
import { Move } from '../../../shared/move-notation/move-notation.js';
import { MarkPlacement } from './BoardMarksLayer.js';

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
};

export const ROOT_ID = 0;

const createRootNode = (): TreeNode => ({
    id: ROOT_ID,
    parentId: null,
    children: [],
    data: null,
});

/**
 * Initial node list of a fresh tree: just the (empty board) root.
 * Used to seed the state that backs a GameTree.
 */
export const createRootNodes = (): TreeNode[] => [createRootNode()];

/**
 * A branching move tree: every played move is a node, branching when an
 * alternative continuation is explored. A "setup" node groups an arbitrary
 * number of freely placed stones (any color) into a single node.
 *
 * The node list is held in an external ref (so it can live in, and be serialized
 * with, the Hexplorer state); the tree only owns the next-id counter.
 */
export class GameTree
{
    private nextId: number;

    constructor(
        readonly nodes: Ref<TreeNode[]> = ref(createRootNodes()),
    ) {
        this.nextId = this.nodes.value.reduce((max, node) => Math.max(max, node.id), ROOT_ID) + 1;
    }

    getRoot(): TreeNode
    {
        return this.getNode(ROOT_ID);
    }

    getNode(id: number): TreeNode
    {
        const node = this.nodes.value.find(n => n.id === id);

        if (!node) {
            throw new Error(`GameTree: node ${id} not found`);
        }

        return node;
    }

    /**
     * Path from root to the given node, inclusive (root is always first).
     */
    getPath(id: number): TreeNode[]
    {
        const path: TreeNode[] = [];
        let current: TreeNode | null = this.getNode(id);

        while (current) {
            path.unshift(current);
            current = current.parentId === null ? null : this.getNode(current.parentId);
        }

        return path;
    }

    findChildByMove(parentId: number, move: HexMove): null | TreeNode
    {
        const parent = this.getNode(parentId);

        for (const childId of parent.children) {
            const child = this.getNode(childId);

            if (child.data?.type === 'move' && child.data.move === move) {
                return child;
            }
        }

        return null;
    }

    private insertNode(parentId: number, data: TreeNodeData): TreeNode
    {
        const node: TreeNode = {
            id: this.nextId++,
            parentId,
            children: [],
            data,
        };

        this.nodes.value.push(node);
        this.getNode(parentId).children.push(node.id);

        return node;
    }

    addMove(parentId: number, move: HexMove): TreeNode
    {
        return this.insertNode(parentId, { type: 'move', move });
    }

    addSetup(parentId: number, stones: SetupStone[], nextPlayer: 0 | 1, marks: MarkPlacement[] = []): TreeNode
    {
        return this.insertNode(parentId, { type: 'setup', stones, marks, nextPlayer });
    }

    /**
     * Color of a move node, derived by walking up to the nearest
     * setup-or-root ancestor and alternating colors from there.
     * Used for display only (actual replay uses PlayingGameFacade's
     * own alternation per segment).
     */
    getMoveColor(id: number): 0 | 1
    {
        const path = this.getPath(id);
        let color: 0 | 1 = 0;

        for (const node of path) {
            if (node.data === null) {
                continue;
            }

            if (node.data.type === 'setup') {
                color = node.data.nextPlayer;
                continue;
            }

            if (node.id === id) {
                return color;
            }

            color = 1 - color as 0 | 1;
        }

        return color;
    }

    /**
     * Removes a node and all its descendants from the tree.
     * The root cannot be removed.
     */
    removeNode(id: number): void
    {
        if (id === ROOT_ID) {
            throw new Error('GameTree: cannot remove the root node');
        }

        const node = this.getNode(id);

        const toRemove = new Set<number>();
        const stack = [id];

        while (stack.length > 0) {
            const current = stack.pop()!;
            toRemove.add(current);
            stack.push(...this.getNode(current).children);
        }

        const parent = this.getNode(node.parentId as number);
        parent.children = parent.children.filter(childId => childId !== id);

        this.nodes.value = this.nodes.value.filter(n => !toRemove.has(n.id));
    }

    /**
     * Resets the tree back to just its root.
     */
    reset(): void
    {
        this.load(createRootNodes());
    }

    /**
     * Reloads the next-id counter from the current node list.
     * Call after the backing node list has been replaced externally
     * (e.g the whole state was restored from a saved analysis).
     */
    reload(): void
    {
        this.nextId = this.nodes.value.reduce((max, node) => Math.max(max, node.id), ROOT_ID) + 1;
    }

    /**
     * Replaces the whole tree with the given nodes (e.g restored from a saved analysis).
     */
    load(nodes: TreeNode[]): void
    {
        this.nodes.value = nodes;
        this.reload();
    }
}
