import BoardState from './BoardState';
import Move from './Move';

export default interface PlayerInterface
{
    /**
     * Player turn started. Return a promise of move.
     */
    playMove(boardState: BoardState): Promise<Move>;

    /**
     * Called when game has finished.
     */
    gameEnded(issue: string): void;
}
