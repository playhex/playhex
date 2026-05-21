import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import HostedGameStore from '../../store/HostedGameStore.js';
import { GameSpectators } from '../../services/GameSpectators.js';

@Service()
export default class ThumbnailGameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameStore: HostedGameStore,
        private gameSpectators: GameSpectators,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('thumbnailGameUpdateRequest', async (gameId, answer) => {
            const hostedGame = await this.hostedGameStore.getActiveOrArchivedGame(gameId);
            const spectatorsCount = this.gameSpectators.getSpectatorPlayers(gameId).length;

            answer(hostedGame, spectatorsCount);
        });
    }
}
