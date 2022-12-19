import BoardState from './BoardState';
import Move from './Move';

export default interface PlayerInterface
{
    /**
     * Whether this player is ready to start the game.
     */
    isReady(): boolean;

    /**
     * Player turn started. Return a promise of move.
     */
    playMove(boardState: BoardState): Promise<Move>;

    /**
     * Called when game has finished.
     */
    gameEnded(issue: string): void;
}
