import type { HexMove } from '@playhex/move-notation';

/**
 * Serialize moves to a space separated string, e.g "a1 swap-pieces c4",
 * to store them in a text column.
 */
export const serializeMoves = <T extends HexMove>(moves: T[]): string => {
    return moves.join(' ');
};

export const deserializeMoves = <T extends HexMove = HexMove>(value: unknown): T[] => {
    return typeof value === 'string' && value.length > 0
        ? value.split(' ') as T[]
        : []
    ;
};
