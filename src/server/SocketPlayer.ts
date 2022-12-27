import { Socket } from 'socket.io';
import { Move, PlayerInterface } from '../../dist/shared/game-engine';
import { PlayerData } from '@shared/game-engine/Types';

export default class SocketPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;
    private readyPromiseResolve: null|((ok: true) => void);

    public constructor(
        /**
         * Slot reserved for this player, or free if null.
         */
        private playerData: null|PlayerData = null,

        /**
         * Current socket connected to this slot.
         * Can be null if player disconnected (can join again).
         */
        private socket: null|Socket = null,
    ) {}

    public isAssignedToPlayer(): boolean
    {
        return null !== this.playerData;
    }

    public getPlayerId(): null|string
    {
        return this.playerData?.id ?? null;
    }

    public setPlayerData(playerData: PlayerData): SocketPlayer
    {
        this.playerData = playerData;

        return this;
    }

    public getSocket(): null|Socket
    {
        return this.socket;
    }

    public setSocket(socket: Socket): void
    {
        this.socket = socket;

        if (null !== this.readyPromiseResolve) {
            this.readyPromiseResolve(true);
        }
    }

    public doMove(move: Move): void
    {
        if (null === this.movePromiseResolve) {
            return;
        }

        this.movePromiseResolve(move);
    }

    public async isReady(): Promise<true>
    {
        if (null !== this.socket) {
            return true;
        }

        return new Promise(resolve => {
            this.readyPromiseResolve = resolve;
        });
    }

    public async playMove(): Promise<Move>
    {
        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }

    public toData(): PlayerData
    {
        return this.playerData ?? {
            id: '(free)',
        };
    }
}
