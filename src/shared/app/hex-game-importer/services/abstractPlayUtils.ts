import { HexMove } from '../../../move-notation/hex-move-notation.js';
import { ImportUserError } from '../errors.js';

export type AbstractPlayMoveResult = {
    type: string;
    where?: string;
};

export type AbstractPlayStackEntry = {
    _results: AbstractPlayMoveResult[];
};

export type AbstractPlayState = {
    game: string;
    variants: string[];
    stack: AbstractPlayStackEntry[];
    gameover: boolean;
};

export const parseAbstractPlayBoardsize = (variants: string[]): number => {
    const sizeVariant = variants.find(variant => variant.startsWith('size-'));

    return sizeVariant ? parseInt(sizeVariant.replace('size-', ''), 10) : 11;
};

export const parseAbstractPlayMoves = (state: AbstractPlayState): HexMove[] => {
    if (!state.gameover) {
        throw new ImportUserError('Cannot import an Abstract Play game that is still in progress (not gameover)');
    }

    const moves: HexMove[] = [];

    for (const entry of state.stack) {
        for (const result of entry._results) {
            if (result.type === 'place' && result.where) {
                moves.push(result.where as HexMove);
            }
        }
    }

    return moves;
};
