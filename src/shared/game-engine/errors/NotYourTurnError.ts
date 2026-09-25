import type { HexMove } from '../../../packages/move-notation/hex-move-notation.js';
import IllegalMove from './IllegalMove.js';

export default class NotYourTurnError extends IllegalMove
{
    constructor(move: HexMove)
    {
        super(move, 'Not your turn');
    }
}
