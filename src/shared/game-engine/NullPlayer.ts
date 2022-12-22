import GameInput from './GameInput';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

export default class NullPlayer implements PlayerInterface
{
    private static instance: null|NullPlayer = null;

    public static getInstance(): NullPlayer
    {
        if (null === NullPlayer.instance) {
            NullPlayer.instance = new NullPlayer();
        }

        return NullPlayer.instance;
    }

    public async playMove(gameInput: GameInput): Promise<Move>
    {
        throw new Error('Cannot play with a null player');
    }
}
