import TypedEventEmitter from 'typed-emitter';
import PlayerGameInput from './PlayerGameInput';
import Move from './Move';

export type PlayerEvents = {
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
     * How you should call me. Displayed on player interface.
     */
    getName(): string;

    /**
     * Used to receive a PlayerGameInput,
     * which is used to make action from player.
     * Provided when instanciating a Game with this player.
     */
    setPlayerGameInput(playerGameInput: PlayerGameInput): void;

    /**
     * This player makes a move.
     * Move must be sent through playerGameInput instance.
     *
     * @throws IllegalMove on invalid move.
     */
    move(move: Move): void;

    /**
     * This player resigns.
     * Must be sent through playerGameInput instance.
     */
    resign(): void;
}
