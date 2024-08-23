import { Player, OnlinePlayers } from '../../shared/app/models';
import { HexSocket } from '../server';
import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';

interface OnlinePlayersServiceEvents
{
    playerConnected: (player: Player) => void;
    playerDisconnected: (player: Player) => void;
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
    private onlinePlayers: { [publicId: string]: {
        player: Player;
        sockets: HexSocket[];
    } } = {};

    socketHasConnected(socket: HexSocket): void
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
            player,
            sockets: [socket],
        };

        this.emit('playerConnected', player);
    }

    socketHasDisconnected(socket: HexSocket): void
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

    getOnlinePlayers(): OnlinePlayers
    {
        const players: { [key: string]: Player } = {};

        Object.values(this.onlinePlayers).forEach(p => {
            players[p.player.publicId] = p.player;
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

    isOnline(player: Player): boolean
    {
        return player.publicId in this.onlinePlayers;
    }
}
