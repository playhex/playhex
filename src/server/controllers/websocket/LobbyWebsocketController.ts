import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import Rooms from '../../../shared/app/Rooms.js';

@Service()
export default class LobbyWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('joinGame', (gameId, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameRepository.playerJoinGame(player, gameId));
        });
    }

    onJoinRoom(socket: HexSocket, room: string)
    {
        if (room !== Rooms.lobby) return;
        const games = this.hostedGameRepository.getActiveGamesData();
        socket.emit('lobbyUpdate', games); // TODO serialization group "hosted-game:socket-update" to prevent sending full tournament
    }
}
