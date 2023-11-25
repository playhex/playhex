import TypedEventEmitter from 'typed-emitter';
import PlayerGameInput from './PlayerGameInput';
import Move from './Move';

export type PlayerEvents = {
    /**
     * Player changed ready status.
     */
    readyStateChanged: (ready: boolean) => void;

    /**
     * Your turn to play.
     * Get board state with this.gameInput.getHexes().
     * Send your move with this.move().
     * this.move() throw IllegalMove on invalid move.
     */
    myTurnToPlay: () => void;
};

export default interface PlayerInterface extends TypedEventEmitter<PlayerEvents>
{
    /**
     * How you should call me. Displayed on user interface.
     */
    getName(): string;

    /**
     * If this player is ready to start playing.
     * Both players must be ready to start the game.
     * Can be false for example when a remote player still not joined.
     */
    isReady(): boolean;

    /**
     * Used to receive a PlayerGameInput,
     * which is used to make action from player.
     * Provided when instanciating a Game with this player.
     */
    setPlayerGameInput(playerGameInput: PlayerGameInput): void;

    /**
     * @throws IllegalMove on invalid move.
     */
    move(move: Move): void;
}
