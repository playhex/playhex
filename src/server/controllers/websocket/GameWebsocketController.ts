import HostedGameStore from '../../store/HostedGameStore.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class GameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameStore: HostedGameStore,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', (gameId, move, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameStore.playerMove(player, gameId, move));
        });

        socket.on('premove', (gameId, premove, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameStore.playerPremove(player, gameId, premove));
        });

        socket.on('cancelPremove', (gameId, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.hostedGameStore.playerCancelPremove(player, gameId));
        });
    }

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;
        const game = await this.hostedGameStore.getActiveOrArchivedGame(gameId);
        socket.emit('gameUpdate', gameId, game);
    }
}
