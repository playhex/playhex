import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexServer, HexSocket } from '../../server';
import OnlinePlayersService from '../../services/OnlinePlayersService';

@Service({ id: 'websocket_controller', multiple: true })
export default class OnlinePlayersController implements WebsocketControllerInterface
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
                this.hexServer.to('online-players').emit(
                    'playerConnected',
                    player,
                    this.onlinePlayersService.getOnlinePlayersCount(),
                );
            })

            .on('playerDisconnected', player => {
                this.hexServer.to('online-players').emit(
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
}
