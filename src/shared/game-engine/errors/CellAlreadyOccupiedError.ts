import { HexMove } from '../../move-notation/hex-move-notation.js';
import IllegalMove from './IllegalMove.js';

export default class CellAlreadyOccupiedError extends IllegalMove
{
    constructor(move: HexMove)
    {
        super(move, 'This cell is already occupied');
    }
}
