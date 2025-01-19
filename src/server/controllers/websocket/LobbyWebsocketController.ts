import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';
import Rooms from '../../../shared/app/Rooms';

@Service()
export default class LobbyWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('joinGame', async (gameId, answer) => {
            const { player } = socket.data;

            if (null === player) {
                answer('Player not found');
                return;
            }

            answer(await this.hostedGameRepository.playerJoinGame(player, gameId));
        });
    }

    onJoinRoom(socket: HexSocket, room: string)
    {
        if (room !== Rooms.lobby) return;
        const games = this.hostedGameRepository.getActiveGamesData();
        socket.emit('lobbyUpdate', games);
    }
}
