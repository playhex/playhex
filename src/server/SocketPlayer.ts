import { PlayerData } from '../../dist/shared/Types';
import { Socket } from 'socket.io';
import { BoardState, Move, PlayerInterface } from '../../dist/shared/game-engine';

export default class SocketPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;

    /**
     * Slot reserved for this player, or free if null.
     */
    public playerData: null|PlayerData = null;

    /**
     * Current socket connected to this slot.
     * Can be null if player disconnected (can join again).
     */
    public socket: null|Socket = null;

    public updatePlayerData(playerData: PlayerData): SocketPlayer
    {
        this.playerData = playerData;

        return this;
    }

    public doMove(move: Move): void
    {
        if (null === this.movePromiseResolve) {
            return;
        }

        this.movePromiseResolve(move);
    }

    public isReady(): boolean
    {
        return null !== this.socket;
    }

    public async playMove(boardState: BoardState): Promise<Move>
    {
        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }
}
