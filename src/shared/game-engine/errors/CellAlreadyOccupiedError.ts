import type { HexMove } from '@playhex/move-notation';
import IllegalMove from './IllegalMove.js';

export default class CellAlreadyOccupiedError extends IllegalMove
{
    constructor(move: HexMove)
    {
        super(move, 'This cell is already occupied');
    }
}
