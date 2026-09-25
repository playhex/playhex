import type { HexMove } from '@playhex/move-notation';
import IllegalMove from './IllegalMove.js';

export default class NotYourTurnError extends IllegalMove
{
    constructor(move: HexMove)
    {
        super(move, 'Not your turn');
    }
}
