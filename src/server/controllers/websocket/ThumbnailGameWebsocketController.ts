import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import GameStore from '../../store/GameStore.js';
import { GameSpectators } from '../../services/GameSpectators.js';
import { addLegacyAliases } from '../../services/legacyPayloadAliases.js';

@Service()
export default class ThumbnailGameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private gameStore: GameStore,
        private gameSpectators: GameSpectators,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('thumbnailGameUpdateRequest', async (gameId, answer) => {
            const game = await this.gameStore.getActiveOrArchivedGame(gameId);
            const spectatorsCount = this.gameSpectators.getSpectatorPlayers(gameId).length;

            answer(addLegacyAliases(game), spectatorsCount);
        });
    }
}
