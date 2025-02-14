import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';

@Service()
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

            answer(await this.hostedGameRepository.playerMove(player, gameId, move));
        });

        socket.on('premove', async (gameId, move, answer) => {
            const { player } = socket.data;

            if (null === player) {
                answer('Player not found');
                return;
            }

            answer(await this.hostedGameRepository.playerPremove(player, gameId, move));
        });

        socket.on('cancelPremove', async (gameId, answer) => {
            const { player } = socket.data;

            if (null === player) {
                answer('Player not found');
                return;
            }

            answer(await this.hostedGameRepository.playerCancelPremove(player, gameId));
        });
    }

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;
        const game = await this.hostedGameRepository.getActiveOrArchivedGame(gameId);
        socket.emit('gameUpdate', gameId, game);
    }
}
