import BoardState from './GameInput';
import Move from './Move';

export default interface PlayerInterface
{
    /**
     * Whether this player is ready to start the game.
     */
    isReady(): Promise<true>;

    /**
     * Player turn started. Return a promise of move.
     */
    playMove(boardState: BoardState): Promise<Move>;
}
