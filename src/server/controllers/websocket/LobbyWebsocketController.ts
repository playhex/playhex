import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from 'server';

@Service({ id: 'websocket_controller', multiple: true })
export default class LobbyWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('createGame', answer => {
            const gameSocketServer = this.hostedGameRepository.createGame();
            answer(gameSocketServer.getId());
        });

        socket.on('joinGame', (gameId, answer) => {
            const joined = this.hostedGameRepository.playerJoinGame(socket.request.session.playerId, gameId);
            answer(joined);
        });

        socket.on('room', (join, room) => {
            socket[join](room);
        });
    }
}
