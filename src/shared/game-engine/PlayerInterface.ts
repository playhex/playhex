import BoardState from './GameInput';
import Move from './Move';

export default interface PlayerInterface
{
    /**
     * Whether this player is ready to start the game.
     * Used to wait for a player connection, or any loading.
     */
    isReady(): Promise<true>;

    /**
     * Player turn started. Return a promise of move.
     * If returned move is invalid, you lose.
     * Use BoardState.checkMove() before returning it.
     */
    playMove(boardState: BoardState): Promise<Move>;
}
