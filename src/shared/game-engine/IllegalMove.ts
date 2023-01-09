import Move from "./Move";

export default class IllegalMove extends Error
{
    constructor(move: Move, message: string)
    {
        super(`Move ${move.toString()}: ${message}`);
    }
}
