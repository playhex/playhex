import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import OnlinePlayersService from '../../services/OnlinePlayersService.js';
import Rooms from '../../../shared/app/Rooms.js';
import { Player } from '../../../shared/app/models/index.js';

/**
 * Send at most one online players count update per this delay.
 */
const PLAYERS_COUNT_THROTTLE_MS = 1000;

const PLAYER_STATUS_ROOM = /^player-status\/(.+)$/;

@Service()
export default class OnlinePlayersWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hexServer: HexServer,
        private onlinePlayersService: OnlinePlayersService,
    ) {
        this.listenOnlinePlayersServiceEvents();
    }

    private countThrottleTimeout: null | NodeJS.Timeout = null;
    private countChangedDuringThrottle = false;
    private lastEmittedCount: null | { active: number, inactive: number } = null;

    /**
     * Emits count immediately, then waits a second before emitting again.
     * If count changed during this second, emits the new count at the end of it.
     */
    private emitActivePlayersCount(): void
    {
        if (this.countThrottleTimeout !== null) {
            this.countChangedDuringThrottle = true;
            return;
        }

        const count = this.onlinePlayersService.getActiveAndInactivePlayersCount();

        if (count.active !== this.lastEmittedCount?.active || count.inactive !== this.lastEmittedCount?.inactive) {
            this.lastEmittedCount = count;
            this.hexServer.to(Rooms.onlinePlayersCount).emit('onlinePlayersCount', count);
        }

        this.countThrottleTimeout = setTimeout(() => {
            this.countThrottleTimeout = null;

            if (this.countChangedDuringThrottle) {
                this.countChangedDuringThrottle = false;
                this.emitActivePlayersCount();
            }
        }, PLAYERS_COUNT_THROTTLE_MS);
    }

    private emitPlayerStatus(player: Player): void
    {
        this.hexServer.to(Rooms.playerStatus(player.publicId)).emit(
            'playerStatus',
            player.publicId,
            this.onlinePlayersService.getPlayerStatus(player.publicId),
        );
    }

    private listenOnlinePlayersServiceEvents(): void
    {
        this.onlinePlayersService

            .on('playerConnected', player => {
                this.hexServer.to(Rooms.onlinePlayers).emit(
                    'playerConnected',
                    player,
                    this.onlinePlayersService.getOnlinePlayersCount(),
                );
            })

            .on('playerDisconnected', player => {
                this.hexServer.to(Rooms.onlinePlayers).emit(
                    'playerDisconnected',
                    player,
                    this.onlinePlayersService.getOnlinePlayersCount(),
                );

                this.emitPlayerStatus(player);
                this.emitActivePlayersCount();
            })

            .on('playerActive', (player, lastState) => {
                // Ignore when player was already active
                if (lastState) {
                    return;
                }

                this.hexServer.to(Rooms.onlinePlayers).emit(
                    'playerActive',
                    player,
                );

                this.emitPlayerStatus(player);
                this.emitActivePlayersCount();
            })

            .on('playerInactive', (player) => {
                this.hexServer.to(Rooms.onlinePlayers).emit(
                    'playerInactive',
                    player,
                );

                this.emitPlayerStatus(player);
                this.emitActivePlayersCount();
            })

        ;
    }

    onConnection(socket: HexSocket): void
    {
        this.onlinePlayersService.socketHasConnected(socket);
        socket.on('disconnect', () => this.onlinePlayersService.socketHasDisconnected(socket));

        socket.on('activity', onlinePlayerPage => {
            const { player } = socket.data;

            if (player === null) {
                return;
            }

            this.onlinePlayersService.notifyPlayerActivity(player, onlinePlayerPage);
        });
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        if (room === Rooms.onlinePlayers) {
            const onlinePlayers = this.onlinePlayersService.getOnlinePlayers();
            socket.emit('onlinePlayersUpdate', onlinePlayers);
        }

        if (room === Rooms.onlinePlayersCount) {
            // Send same count as other clients, the pending throttled emit will update all of them together
            this.lastEmittedCount ??= this.onlinePlayersService.getActiveAndInactivePlayersCount();
            socket.emit('onlinePlayersCount', this.lastEmittedCount);
        }

        const playerStatusPublicId = room.match(PLAYER_STATUS_ROOM)?.[1];

        if (playerStatusPublicId !== undefined) {
            socket.emit('playerStatus', playerStatusPublicId, this.onlinePlayersService.getPlayerStatus(playerStatusPublicId));
        }
    }
}
