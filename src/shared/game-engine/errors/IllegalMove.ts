import Move from '../Move.js';

export default class IllegalMove extends Error
{
    constructor(move: Move, message: string)
    {
        super(`Move ${move.toString()}: ${message}`);
    }
}
