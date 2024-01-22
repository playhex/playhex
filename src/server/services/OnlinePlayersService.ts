import { OnlinePlayerData, OnlinePlayersData, PublicPlayerData } from '@shared/app/Types';
import { HexSocket } from '../server';
import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';

interface OnlinePlayersServiceEvents
{
    playerConnected: (player: PublicPlayerData) => void;
    playerDisconnected: (player: PublicPlayerData) => void;
}

/**
 * onConnection can be trigerred with a player already connected,
 * i.e already having a socket on another browser tab.
 *
 * Same, disconnect event can be triggered,
 * but player still connected on another socket.
 *
 * This service keep tracking new players and really disconnected players,
 * and emit events only when a real player connection occured.
 */
@Service()
export default class OnlinePlayersService extends TypedEmitter<OnlinePlayersServiceEvents>
{
    private onlinePlayers: { [key: string]: {
        playerData: PublicPlayerData;
        sockets: HexSocket[];
    } } = {};

    async socketHasConnected(socket: HexSocket): Promise<void>
    {
        const { player } = socket.data;

        // socket not authenticated, ignoring
        if (null === player) {
            return;
        }

        // player already connected (probably on another tab)
        if (this.onlinePlayers[player.publicId]) {
            this.onlinePlayers[player.publicId].sockets.push(socket);
            return;
        }

        this.onlinePlayers[player.publicId] = {
            playerData: player,
            sockets: [socket],
        };

        this.emit('playerConnected', player);
    }

    async socketHasDisconnected(socket: HexSocket): Promise<void>
    {
        const { player } = socket.data;

        // socket not authenticated, ignoring
        if (null === player) {
            return;
        }

        // player was not listed... so ignoring
        if (!this.onlinePlayers[player.publicId]) {
            return;
        }

        this.onlinePlayers[player.publicId].sockets = this.onlinePlayers[player.publicId].sockets
            .filter(s => s.id !== socket.id && s.connected)
        ;

        // player still connected (probably on another tab)
        if (this.onlinePlayers[player.publicId].sockets.length > 0) {
            return;
        }

        delete this.onlinePlayers[player.publicId];

        this.emit('playerDisconnected', player);
    }

    getOnlinePlayers(): OnlinePlayersData
    {
        const players: { [key: string]: OnlinePlayerData } = {};

        Object.values(this.onlinePlayers).forEach(p => {
            players[p.playerData.publicId] = {
                playerData: p.playerData,
                connected: true,
            };
        });

        return {
            totalPlayers: Object.keys(this.onlinePlayers).length,
            players,
        };
    }

    getOnlinePlayersCount(): number
    {
        return Object.keys(this.onlinePlayers).length;
    }
}
