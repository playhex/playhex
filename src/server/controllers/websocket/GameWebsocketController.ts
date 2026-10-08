import GameStore from '../../store/GameStore.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';

@Service()
export default class GameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private gameStore: GameStore,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('move', (gameId, move, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerMove(player, gameId, move));
        });

        socket.on('premove', (gameId, premove, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerPremove(player, gameId, premove));
        });

        socket.on('cancelPremove', (gameId, answer) => {
            const { player } = socket.data;

            if (player === null) {
                answer('Player not found');
                return;
            }

            answer(this.gameStore.playerCancelPremove(player, gameId));
        });
    }

    async onJoinRoom(socket: HexSocket, room: string)
    {
        const gameId = room.match(/games\/(.+)/)?.[1];
        if (gameId == null) return;
        const game = await this.gameStore.getActiveOrArchivedGame(gameId);
        socket.emit('gameUpdate', gameId, game);
    }
}
