import { createRootNodes, ROOT_ID, TreeNode } from './GameTree.js';

/**
 * Raw, plain state shared between useHexplorer and the tools.
 * Kept as a POJO wrapped in a single ref so tools can mutate
 * it directly and have changes stay reactive.
 *
 * Fully JSON-serializable, so it doubles as the download/restore format
 * of a whole analysis (board size, move tree and current position included).
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
    boardsize,
    currentNodeId: ROOT_ID,
    nodes: createRootNodes(),
});
