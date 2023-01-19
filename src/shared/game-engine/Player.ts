import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import Move from './Move';
import PlayerGameInput from './PlayerGameInput';

type PlayerEvents = {
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

export default class Player extends (EventEmitter as unknown as new () => TypedEmitter<PlayerEvents>)
{
    private ready = false;
    protected playerGameInput: null | PlayerGameInput = null;

    getName(): string
    {
        return 'Player';
    }

    setPlayerGameInput(playerGameInput: PlayerGameInput): void
    {
        this.playerGameInput = playerGameInput;
    }

    isReady(): boolean
    {
        return this.ready;
    }

    setReady(ready = true): void
    {
        const changed = this.ready !== ready;

        this.ready = ready;

        if (changed) {
            this.emit('readyStateChanged', ready);
        }
    }

    /**
     * @throws IllegalMove on invalid move.
     */
    move(move: Move): void
    {
        if (null === this.playerGameInput) {
            throw new Error('Cannot move, no player game input provided.');
        }

        this.playerGameInput.move(move);
    }
}
