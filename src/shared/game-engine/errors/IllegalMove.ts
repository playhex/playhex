import { HexMove } from '../../move-notation/hex-move-notation.js';

export default class IllegalMove extends Error
{
    constructor(move: HexMove, message: string)
    {
        super(`Move ${move}: ${message}`);
    }
}
