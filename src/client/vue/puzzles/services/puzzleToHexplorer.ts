import { toRef } from 'vue';
import { Puzzle } from '../../../../shared/app/models/index.js';
import { createNodeResolver, findSolution } from '../../../../shared/app/puzzles/puzzleTree.js';
import { createHexplorerState } from '../../hexplorer/HexplorerState.js';
import { GameTree, ROOT_ID, SetupStone } from '../../hexplorer/GameTree.js';

/**
 * Creates a Hexplorer analysis from a puzzle:
 * initial position as a setup node, with disabled cells as crosses, then solution moves.
 * Current position is the initial position.
 */
export const puzzleToHexplorerAnalysis = (puzzle: Puzzle): string => {
    const state = createHexplorerState(puzzle.boardsize);
    const tree = new GameTree(toRef(state, 'nodes'));

    const stones: SetupStone[] = [
        ...puzzle.redStones.map((move): SetupStone => ({ move, color: 0 })),
        ...puzzle.blueStones.map((move): SetupStone => ({ move, color: 1 })),
    ];

    const setupNode = tree.addSetup(ROOT_ID, stones, puzzle.playerColor, puzzle.disabledCells.map(move => ({ move, type: 'cross' })));
    let parentId = setupNode.id;

    for (const node of findSolution(puzzle.tree, createNodeResolver(puzzle.tree)) ?? []) {
        parentId = tree.addMove(parentId, node.move!).id;
    }

    state.currentNodeId = setupNode.id;
    state.currentPlayer = puzzle.playerColor;

    return JSON.stringify(state);
};
