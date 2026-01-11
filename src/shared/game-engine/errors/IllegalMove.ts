import { Move } from '../../move-notation/move-notation.js';

export default class IllegalMove extends Error
{
    constructor(move: Move, message: string)
    {
        super(`Move ${move}: ${message}`);
    }
}
