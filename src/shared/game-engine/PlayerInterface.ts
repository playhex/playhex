import GameInput from './GameInput';
import Move from './Move';
import { PlayerData } from './Types';

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
     * Use GameInput.checkMove() before returning it.
     */
    playMove(boardState: GameInput): Promise<Move>;

    toData(): PlayerData;
}
