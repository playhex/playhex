import { HexMove } from '@playhex/move-notation';
import type { TreeNode } from '../hexplorerStudy.js';

export type ImportedGame = {
    boardsize: number;
    moves: HexMove[];
    playerBlackName?: string;
    playerWhiteName?: string;

    /**
     * Set when imported from a PlayHex game,
     * e.g to link it to a puzzle created from this game.
     */
    playHexGamePublicId?: string;

    /**
     * Whole tree when format can hold more than a line of moves, e.g SGF
     * with variations, setup stones, marks and comments.
     * Moves are still the main line, for what only needs a game.
     */
    tree?: TreeNode[];
};
