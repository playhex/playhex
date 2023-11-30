import { OnlinePlayerData, OnlinePlayersData, PlayerData } from '@shared/app/Types';
import PlayerRepository from '../repositories/PlayerRepository';
import { HexSocket } from '../server';
import { Service } from 'typedi';
import EventEmitter from 'events';


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
export default class OnlinePlayersService extends EventEmitter
{
    private onlinePlayers: { [key: string]: {
        playerData: PlayerData;
        sockets: HexSocket[];
    } } = {};

    constructor(
        private playerRepository: PlayerRepository,
    ) {
        super();
    }

    socketHasConnected(socket: HexSocket): void
    {
        const { playerId } = socket.request.session;
        const player = this.playerRepository.getPlayer(playerId);

        // socket not authenticated, ignoring
        if (!player) {
            return;
        }

        // player already connected (probably on another tab)
        if (this.onlinePlayers[playerId]) {
            this.onlinePlayers[playerId].sockets.push(socket);
            return;
        }

        this.onlinePlayers[playerId] = {
            playerData: player,
            sockets: [socket],
        };

        this.emit('playerConnected', player);
    }

    socketHasDisconnected(socket: HexSocket): void
    {
        const { playerId } = socket.request.session;
        const player = this.playerRepository.getPlayer(playerId);

        // socket not authenticated, ignoring
        if (!player) {
            return;
        }

        // player was not listed... so ignoring
        if (!this.onlinePlayers[playerId]) {
            return;
        }

        this.onlinePlayers[playerId].sockets = this.onlinePlayers[playerId].sockets
            .filter(s => s.id !== socket.id && s.connected)
        ;

        // player still connected (probably on another tab)
        if (this.onlinePlayers[playerId].sockets.length > 0) {
            return;
        }

        delete this.onlinePlayers[playerId];

        this.emit('playerDisconnected', player);
    }

    getOnlinePlayers(): OnlinePlayersData
    {
        const players: { [key: string]: OnlinePlayerData } = {};

        Object.values(this.onlinePlayers).forEach(p => {
            players[p.playerData.id] = {
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
