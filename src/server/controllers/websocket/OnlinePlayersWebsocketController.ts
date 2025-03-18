import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexServer, HexSocket } from '../../server.js';
import OnlinePlayersService from '../../services/OnlinePlayersService.js';
import Rooms from '../../../shared/app/Rooms.js';

@Service()
export default class OnlinePlayersWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hexServer: HexServer,
        private onlinePlayersService: OnlinePlayersService,
    ) {
        this.listenOnlinePlayersServiceEvents();
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
            })

            .on('playerInactive', (player) => {
                this.hexServer.to(Rooms.onlinePlayers).emit(
                    'playerInactive',
                    player,
                );
            })

        ;
    }

    onConnection(socket: HexSocket): void
    {
        this.onlinePlayersService.socketHasConnected(socket);
        socket.on('disconnect', () => this.onlinePlayersService.socketHasDisconnected(socket));

        socket.on('activity', () => {
            const { player } = socket.data;

            if (null === player) {
                return;
            }

            this.onlinePlayersService.notifyPlayerActivity(player);
        });
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        if (room !== Rooms.onlinePlayers) return;
        const onlinePlayers = this.onlinePlayersService.getOnlinePlayers();
        socket.emit('onlinePlayersUpdate', onlinePlayers);
    }
}
