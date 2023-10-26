import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import Move from './Move';
import PlayerGameInput from './PlayerGameInput';
import { PlayerIndex } from './Types';
import PlayerInterface, { PlayerEvents } from './PlayerInterface';

export default class Player
    extends (EventEmitter as unknown as new () => TypedEmitter<PlayerEvents>)
    implements PlayerInterface
{
    private ready = false;
    protected playerGameInput: null | PlayerGameInput = null;

    getName(): string
    {
        return 'Player';
    }

    getPlayerIndex(): PlayerIndex
    {
        if (null === this.playerGameInput) {
            throw new Error('No player game input provided.');
        }

        return this.playerGameInput.getPlayerIndex();
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

    resign(): void
    {
        if (null === this.playerGameInput) {
            throw new Error('Cannot resign, no player game input provided.');
        }

        this.playerGameInput.resign();
    }
}
