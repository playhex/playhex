import Move from '../Move.js';
import IllegalMove from './IllegalMove.js';

export default class NotYourTurnError extends IllegalMove
{
    constructor(move: Move)
    {
        super(move, 'Not your turn');
    }
}
