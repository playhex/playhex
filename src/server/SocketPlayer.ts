import { Socket } from 'socket.io';
import { Move, PlayerInterface } from '../../dist/shared/game-engine';
import { PlayerData } from '@shared/game-engine/Types';

export default class SocketPlayer implements PlayerInterface
{
    private movePromiseResolve: null|((move: Move) => void) = null;
    private readyPromiseResolve: null|((ok: true) => void);

    constructor(
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

    isAssignedToPlayer(): boolean
    {
        return null !== this.playerData;
    }

    getPlayerId(): null|string
    {
        return this.playerData?.id ?? null;
    }

    setPlayerData(playerData: PlayerData): SocketPlayer
    {
        this.playerData = playerData;

        return this;
    }

    getSocket(): null|Socket
    {
        return this.socket;
    }

    setSocket(socket: Socket): void
    {
        this.socket = socket;

        if (null !== this.readyPromiseResolve) {
            this.readyPromiseResolve(true);
        }
    }

    doMove(move: Move): void
    {
        if (null === this.movePromiseResolve) {
            return;
        }

        this.movePromiseResolve(move);
    }

    async isReady(): Promise<true>
    {
        if (null !== this.socket) {
            return true;
        }

        return new Promise(resolve => {
            this.readyPromiseResolve = resolve;
        });
    }

    async playMove(): Promise<Move>
    {
        return new Promise(resolve => {
            this.movePromiseResolve = resolve;
        });
    }

    toData(): PlayerData
    {
        return this.playerData ?? {
            id: '(free)',
        };
    }
}
