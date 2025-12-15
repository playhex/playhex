import Move from '../Move.js';
import IllegalMove from './IllegalMove.js';

export default class CellAlreadyOccupiedError extends IllegalMove
{
    constructor(move: Move)
    {
        super(move, 'This cell is already occupied');
    }
}
