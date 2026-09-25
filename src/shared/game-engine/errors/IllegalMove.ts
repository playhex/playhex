import type { HexMove } from '@playhex/move-notation';

export default class IllegalMove extends Error
{
    constructor(move: HexMove, message: string)
    {
        super(`Move ${move}: ${message}`);
    }
}
