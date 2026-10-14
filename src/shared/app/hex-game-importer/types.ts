import { HexMove } from '@playhex/move-notation';

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
};
