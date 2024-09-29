import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexServer, HexSocket } from '../../server';
import OnlinePlayersService from '../../services/OnlinePlayersService';
import Rooms from '../../../shared/app/Rooms';

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

        ;
    }

    onConnection(socket: HexSocket): void
    {
        this.onlinePlayersService.socketHasConnected(socket);
        socket.on('disconnect', () => this.onlinePlayersService.socketHasDisconnected(socket));
    }

    onJoinRoom(socket: HexSocket, room: string): void
    {
        if (room !== Rooms.onlinePlayers) return;
        const onlinePlayers = this.onlinePlayersService.getOnlinePlayers();
        socket.emit('onlinePlayersUpdate', onlinePlayers);
    }
}
