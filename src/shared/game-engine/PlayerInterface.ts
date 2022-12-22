import BoardState from './GameInput';
import Move from './Move';

export default interface PlayerInterface
{
    /**
     * Player turn started. Return a promise of move.
     */
    playMove(boardState: BoardState): Promise<Move>;
}
