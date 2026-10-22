import type { Move } from '@playhex/move-notation';
import type { SolveResult } from '../ai-jobs/protocol.js';
import { collectCells, createParallelsFinder, findTranspositions, getParallelKey, isElseNode, type PuzzleNode } from '../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleGenerateWarning, PuzzleGenerateWarningCode } from '../../shared/app/puzzles/puzzleGenerate.js';
import type { Position } from './puzzleCheckUtils.js';

/*
 * Parallel sequences of a generated tree, see PuzzleTreeGenerator:
 * bridges intrusions found while generating main sequence are declared once it is known, to not overlap its cells.
 */

/**
 * Opponent bridge the player can intrude, opponent answering in the other carrier cell.
 */
export type BridgeIntrusions = {
    key: string;

    /**
     * Player intrusion and computer answer, for each winning intrusion.
     */
    sequences: [Move, Move][];
};

/**
 * Bridges intrusions found on a node, player to move, to declare as parallel sequences,
 * or else to play as main moves.
 */
export type ParallelCandidates = {
    position: Position;
    winning: Map<Move, SolveResult>;

    /**
     * Cells avoided by ancestors, without the ones of these bridges.
     */
    avoid: Set<Move>;

    /**
     * Cells of parallel sequences already in tree.
     */
    blocked: Set<Move>;

    bridges: BridgeIntrusions[];
};

/**
 * Nodes below this one, parallel sequences included.
 */
export const countNodes = (node: PuzzleNode): number => [...node.children ?? [], ...node.parallel ?? []]
    .reduce((count, child) => count + 1 + (isElseNode(child) ? 0 : countNodes(child)), 0);

/**
 * Nodes that can still be added to tree, see PUZZLE_MAX_NODES.
 */
export class NodeBudget
{
    constructor(
        private remaining: number,
    ) {}

    /**
     * Returns false, and reserves nothing, if not enough nodes remain.
     */
    reserve(count: number): boolean
    {
        if (this.remaining < count) {
            return false;
        }

        this.remaining -= count;

        return true;
    }

    release(count: number): void
    {
        this.remaining += count;
    }
}

/**
 * Adds cells of parallel sequences declared on this node.
 */
export const withParallelCells = (cells: Set<Move>, node: PuzzleNode): Set<Move> => node.parallel?.length
    ? new Set([...cells, ...collectCells({ parallel: node.parallel }) as Set<Move>])
    : cells
;

export type ParallelsContext = {
    tree: PuzzleNode;

    /**
     * Node generation started from.
     */
    start: PuzzleNode;

    /**
     * Cells of parallel sequences declared above start node.
     */
    inheritedCells: Set<Move>;

    /**
     * Bridges intrusions not played in main sequence, by node where they were found.
     */
    candidates: Map<PuzzleNode, ParallelCandidates>;

    /**
     * Main sequence moves to reach each generated node, for warnings.
     */
    paths: Map<PuzzleNode, Move[]>;

    budget: NodeBudget;
    warn: (code: PuzzleGenerateWarningCode, path: Move[], params?: PuzzleGenerateWarning['params']) => void;
};

/**
 * Declares bridges intrusions as parallel sequences, top-down from start node.
 *
 * A bridge cannot be a parallel sequence when main sequence uses its cells,
 * or when it would differ on both moves orders of a transposition.
 * Its intrusions are then played as main moves by `playIntrusions`, else they would fail while winning.
 * As this changes main sequence cells, parallel sequences are declared again, until all bridges fit.
 */
export const declareParallelSequences = async (
    context: ParallelsContext,
    playIntrusions: (node: PuzzleNode, bridges: BridgeIntrusions[]) => Promise<void>,
): Promise<void> => {
    const { tree, start, inheritedCells, candidates: parallelCandidates, paths, budget, warn } = context;

    /**
     * Node declaring each parallel sequence root, and its bridge.
     */
    const declaringNodes = new Map<PuzzleNode, { node: PuzzleNode, bridge: BridgeIntrusions }>();

    /**
     * Bridges that cannot be parallel sequences, to play as main moves instead, by declaring node.
     */
    let dropped = new Map<PuzzleNode, BridgeIntrusions[]>();

    const drop = (node: PuzzleNode, bridge: BridgeIntrusions): void => {
        dropped.set(node, [...dropped.get(node) ?? [], bridge]);
    };

    const removeRoot = (node: PuzzleNode, root: PuzzleNode): void => {
        node.parallel = node.parallel?.filter(other => other !== root);

        if (node.parallel?.length === 0) {
            delete node.parallel;
        }

        budget.release(countNodes({ parallel: [root] }));
        declaringNodes.delete(root);
    };

    /**
     * @param declaredKeys Bridges declared, or dropped, by ancestors
     * @param usedCells Cells of parallel sequences declared by ancestors
     */
    const declare = (node: PuzzleNode, declaredKeys: Set<string>, usedCells: Set<Move>): void => {
        const candidates = parallelCandidates.get(node);

        usedCells = withParallelCells(usedCells, node);

        if (candidates !== undefined && (node.children?.length ?? 0) > 0) {
            const mainCells = collectCells({ children: node.children }) as Set<Move>;
            const roots: PuzzleNode[] = [];

            for (const bridge of candidates.bridges) {
                const { key, sequences } = bridge;

                if (declaredKeys.has(key)) {
                    continue;
                }

                const cells = sequences.flat();

                declaredKeys = new Set([...declaredKeys, key]);

                if (cells.some(cell => mainCells.has(cell) || usedCells.has(cell))) {
                    drop(node, bridge);
                    continue;
                }

                if (!budget.reserve(1 + 2 * sequences.length)) {
                    // Not retried in next declarations
                    candidates.bridges = candidates.bridges.filter(other => other !== bridge);
                    warn('generator_parallel_dropped', paths.get(node)!, { move: sequences[0][0] });
                    continue;
                }

                const root: PuzzleNode = { children: sequences.map(([intrusion, answer]) => ({ move: intrusion, children: [{ move: answer }] })) };

                roots.push(root);
                declaringNodes.set(root, { node, bridge });
                usedCells = new Set([...usedCells, ...cells]);
            }

            if (roots.length > 0) {
                node.parallel = [...node.parallel ?? [], ...roots];
            }
        }

        for (const child of node.children ?? []) {
            // No parallel sequences in continuations
            if (!isElseNode(child) && child.result === undefined) {
                declare(child, declaredKeys, usedCells);
            }
        }
    };

    /**
     * A transposition must continue with same parallel sequences: drop the different ones.
     */
    const dropTranspositionsParallels = (): void => {
        for (let changed = true; changed;) {
            changed = false;

            const findParallels = createParallelsFinder(tree);

            for (const [leaf, { target }] of findTranspositions(tree)) {
                // Same sequences declared on both moves orders are the same for player
                const leafParallels = findParallels(leaf);
                const targetParallels = findParallels(target);
                const leafKeys = new Set(leafParallels.map(getParallelKey));
                const targetKeys = new Set(targetParallels.map(getParallelKey));
                const different = [
                    ...leafParallels.filter(root => !targetKeys.has(getParallelKey(root))),
                    ...targetParallels.filter(root => !leafKeys.has(getParallelKey(root))),
                ];

                for (const root of different) {
                    const declaring = declaringNodes.get(root);

                    // Existing ones are kept
                    if (declaring === undefined) {
                        continue;
                    }

                    removeRoot(declaring.node, root);
                    drop(declaring.node, declaring.bridge);
                    changed = true;
                }
            }
        }
    };

    for (;;) {
        declare(start, new Set(), new Set(inheritedCells));
        dropTranspositionsParallels();

        if (dropped.size === 0) {
            return;
        }

        const toPlay = dropped;

        dropped = new Map();

        // Declared again once main sequence changed, existing ones are kept
        for (const [root, { node }] of [...declaringNodes]) {
            removeRoot(node, root);
        }

        await Promise.all([...toPlay].map(([node, bridges]) => playIntrusions(node, bridges)));
    }
};
