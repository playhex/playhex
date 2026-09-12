import { GameOptions } from './models/index.js';

export const isUncommonBoardsize = (options: GameOptions): boolean => {
    const { boardsize } = options;

    return boardsize < 9 || boardsize > 19;
};
