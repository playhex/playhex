import { EventEmitter } from 'events';
import Move from './Move';
import PlayerGameInput from './PlayerGameInput';
import PlayerInterface, { PlayerEvents } from './PlayerInterface';
import TypedEventEmitter from 'typed-emitter';

export default class SimplePlayer
    extends (EventEmitter as unknown as new () => TypedEventEmitter<PlayerEvents>)
    implements PlayerInterface
{
    protected playerGameInput: null | PlayerGameInput = null;

    getName(): string
    {
        return 'Player';
    }

    setPlayerGameInput(playerGameInput: PlayerGameInput): void
    {
        this.playerGameInput = playerGameInput;
    }

    move(move: Move): void
    {
        if (null === this.playerGameInput) {
            throw new Error('Cannot resign, no player game input provided.');
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
