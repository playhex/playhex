import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import HostedGameRepository from '../../repositories/HostedGameRepository.js';

@Service()
export default class ThumbnailGameWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('thumbnailGameUpdateRequest', async (gameId, answer) => {
            const hostedGame = await this.hostedGameRepository.getActiveOrArchivedGame(gameId);

            answer(hostedGame);
        });
    }
}
