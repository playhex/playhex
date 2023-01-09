import { Socket } from 'socket.io';
import { PlayerData } from '@shared/app/Types';
import AppPlayer from '../shared/app/AppPlayer';

export default class ServerPlayer extends AppPlayer
{
    constructor(
        /**
         * Current socket connected to this slot.
         * Can be null if player disconnected (can join again).
         */
        private socket: null|Socket = null,
    ) {
        super();
    }

    isAssignedToPlayer(): boolean
    {
        return null !== this.playerData;
    }

    getPlayerId(): null | string
    {
        return this.playerData?.id ?? null;
    }

    setPlayerData(playerData: PlayerData): void
    {
        this.playerData = playerData;
    }

    getSocket(): null|Socket
    {
        return this.socket;
    }

    setSocket(socket: Socket): void
    {
        this.socket = socket;

        this.setReady();
    }
}
