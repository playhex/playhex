import { Player, OnlinePlayers, OnlinePlayer } from '../../shared/app/models/index.js';
import { HexSocket } from '../server.js';
import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
import { DELAY_BEFORE_PLAYER_INACTIVE } from '../../shared/app/playerActivityConfig.js';

interface OnlinePlayersServiceEvents
{
    playerConnected: (player: Player) => void;
    playerDisconnected: (player: Player) => void;

    /**
     * Player is now active, or connected, or made something.
     * Emited every time player made something, with a cooldown time.
     * Use "lastState" to know if player has become active, or was already active.
     * If player was already active, maybe the event can be ignored.
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
        if (player === null) {
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
                active: false, // Player was inactive because offline. Makes playerActive event emit when player connects.
            },
            sockets: [socket],
            activityTimeout: null,
        };

        this.emit('playerConnected', player);

        this.notifyPlayerActivity(player);
    }

    socketHasDisconnected(socket: HexSocket): void
    {
        const { player } = socket.data;

        // socket not authenticated, ignoring
        if (player === null) {
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

        if (onlinePlayer.activityTimeout !== null) {
            clearTimeout(onlinePlayer.activityTimeout);
        }

        if (onlinePlayer.onlinePlayer.active) {
            onlinePlayer.onlinePlayer.active = false;

            this.emit('playerInactive', player);
        }

        delete this.onlinePlayers[player.publicId];
    }

    getOnlinePlayers(): OnlinePlayers
    {
        const players: { [key: string]: OnlinePlayer } = {};

        for (const publicId in this.onlinePlayers) {
            players[publicId] = this.onlinePlayers[publicId].onlinePlayer;
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

    getActiveAndInactivePlayersCount(): { active: number, inactive: number }
    {
        const count = {
            active: 0,
            inactive: 0,
        };

        for (const key in this.onlinePlayers) {
            if (this.onlinePlayers[key].onlinePlayer.active) {
                ++count.active;
            } else {
                ++count.inactive;
            }
        }

        return count;
    }

    /**
     * Whether a player is online:
     * he has a socket connected,
     * but may be either afk, doing something else, or active.
     */
    isOnline(player: Player): boolean
    {
        return player.publicId in this.onlinePlayers;
    }

    /**
     * Whether a player is active:
     * he did something in last minutes.
     */
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

        if (onlinePlayer.activityTimeout !== null) {
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
