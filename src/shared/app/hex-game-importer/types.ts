import { HexMove } from '../../../packages/move-notation/hex-move-notation.js';

export type ImportedGame = {
    boardsize: number;
    moves: HexMove[];
    playerBlackName?: string;
    playerWhiteName?: string;
};
