import TypedEventEmitter from "typed-emitter";
import PlayerGameInput from "./PlayerGameInput";
import Move from "./Move";

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
    getName(): string;

    isReady(): boolean;

    setPlayerGameInput(playerGameInput: PlayerGameInput): void;

    /**
     * @throws IllegalMove on invalid move.
     */
    move(move: Move): void;
}
