import { TypedEmitter } from 'tiny-typed-emitter';
import Move from './Move';
import PlayerGameInput from './PlayerGameInput';
import { PlayerIndex } from './Types';
import PlayerInterface, { PlayerEvents } from './PlayerInterface';

export default class Player extends TypedEmitter<PlayerEvents> implements PlayerInterface
{
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
        if (null !== this.playerGameInput && playerGameInput !== this.playerGameInput) {
            throw new Error('This player has aready a PlayerGameInput from another game');
        }

        this.playerGameInput = playerGameInput;
    }

    checkMove(move: Move): true | string
    {
        if (null === this.playerGameInput) {
            throw new Error('Cannot move, no player game input provided.');
        }

        return this.playerGameInput.checkMove(move);
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
