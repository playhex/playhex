import BoardState from './BoardState';
import Move from './Move';
import PlayerInterface from './PlayerInterface';

export default class NullPlayer implements PlayerInterface
{
    private static instance: null|NullPlayer;

    public static getInstance(): NullPlayer
    {
        if (null === NullPlayer.instance) {
            NullPlayer.instance = new NullPlayer();
        }

        return NullPlayer.instance;
    }

    public async playMove(boardState: BoardState): Promise<Move>
    {
        throw new Error('Cannot play with a null player');
    }

    public isReady(): boolean
    {
        return false;
    }

    public gameEnded(issue: string): void
    {
        console.log('game ended: ' + issue);
    }
}
