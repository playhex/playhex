import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from 'server';
import PlayerRepository from '../../repositories/PlayerRepository';

@Service({ id: 'websocket_controller', multiple: true })
export default class LobbyWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('joinGame', (gameId, answer) => {
            const playerData = this.playerRepository.getPlayer(socket.request.session.playerId);

            if (null === playerData) {
                answer('Player not found');
                return;
            }

            const joined = this.hostedGameRepository.playerJoinGame(playerData, gameId);
            answer(joined);
        });

        socket.on('room', (join, room) => {
            socket[join](room);
        });
    }
}
