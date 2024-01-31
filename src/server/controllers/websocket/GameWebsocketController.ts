import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';

@Service({ id: 'websocket_controller', multiple: true })
export default class GameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', async (gameId, move, answer) => {
            const { player } = socket.data;

            if (null === player) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameRepository.playerMove(player, gameId, move));
        });
    }
}
