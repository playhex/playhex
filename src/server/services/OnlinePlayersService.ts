import { Player, OnlinePlayers, OnlinePlayer } from '../../shared/app/models';
import { HexSocket } from '../server';
import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { DELAY_BEFORE_PLAYER_INACTIVE } from '../../shared/app/playerActivityConfig';

interface OnlinePlayersServiceEvents
{
    playerConnected: (player: Player) => void;
    playerDisconnected: (player: Player) => void;

    /**
     * Player is now active, or connected, or made something.
     *
     * @param lastState Last active state. If false, player wake up. If true, player is still active and did something
     */
    playerActive: (player: Player, lastState: boolean) => void;

    /**
     * Player seems inactive, did nothing for a while, or disconnected.
     */
    playerInactive: (player: Player) => void;
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
        onlinePlayer: OnlinePlayer;
        sockets: HexSocket[];
        activityTimeout: null | NodeJS.Timeout;
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
            this.notifyPlayerActivity(player);
            return;
        }

        this.onlinePlayers[player.publicId] = {
            onlinePlayer: {
                player,
                active: true,
            },
            sockets: [socket],
            activityTimeout: null,
        };

        this.notifyPlayerActivity(player);

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

        this.deleteOnlinePlayer(player);

        this.emit('playerDisconnected', player);
    }

    private deleteOnlinePlayer(player: Player): void
    {
        const onlinePlayer = this.onlinePlayers[player.publicId];

        if (null !== onlinePlayer.activityTimeout) {
            clearTimeout(onlinePlayer.activityTimeout);
        }

        delete this.onlinePlayers[player.publicId];
    }

    getOnlinePlayers(): OnlinePlayers
    {
        const players: { [key: string]: OnlinePlayer } = {};

        for (const publicId in this.onlinePlayers) {
            players[publicId] = this.onlinePlayers[publicId].onlinePlayer;

            // TODO tmp retrocompat, remove later, prevent breaking online players section if client not yet updated
            Object.assign(players[publicId], this.onlinePlayers[publicId].onlinePlayer.player);
        }

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

    isActive(player: Player): boolean
    {
        return this.onlinePlayers[player.publicId]?.onlinePlayer.active ?? false;
    }

    /**
     * Notifies that a player just made something and is currently active.
     */
    notifyPlayerActivity(player: Player): void
    {
        const onlinePlayer = this.onlinePlayers[player.publicId];

        if (!onlinePlayer) {
            return;
        }

        if (null !== onlinePlayer.activityTimeout) {
            clearTimeout(onlinePlayer.activityTimeout);
        }

        onlinePlayer.activityTimeout = setTimeout(() => {
            onlinePlayer.onlinePlayer.active = false;
            this.emit('playerInactive', player);
        }, DELAY_BEFORE_PLAYER_INACTIVE);

        const lastState = onlinePlayer.onlinePlayer.active;
        onlinePlayer.onlinePlayer.active = true;
        this.emit('playerActive', player, lastState);
    }
}
