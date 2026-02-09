import { Move, validateMove } from './move-notation.js';


/**
 * 'swap-pieces' or 'pass'
 */
export type HexSpecialMove = 'swap-pieces' | 'pass';

/**
 * 'a2', 'd4', or 'swap-pieces', 'pass'
 */
export type HexMove = Move | HexSpecialMove;


/**
 * Whether move is a special move like swap-pieces or pass
 */
export const isSpecialHexMove = (move: string): move is HexSpecialMove => {
    return move === 'swap-pieces'
        || move === 'pass'
    ;
};

export const isMoveValid = (move: string): move is HexMove => {
    return validateMove(move)
        || isSpecialHexMove(move)
    ;
};
