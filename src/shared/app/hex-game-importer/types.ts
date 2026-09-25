import { HexMove } from '@playhex/move-notation';

export type ImportedGame = {
    boardsize: number;
    moves: HexMove[];
    playerBlackName?: string;
    playerWhiteName?: string;
};
