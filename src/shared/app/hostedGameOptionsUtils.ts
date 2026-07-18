import { HostedGameOptions } from './models/index.js';

export const isUncommonBoardsize = (options: HostedGameOptions): boolean => {
    const { boardsize } = options;

    return boardsize < 14 || boardsize > 27;
};
