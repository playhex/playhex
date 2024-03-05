import HostedGameRepository from '../../repositories/HostedGameRepository';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from '.';
import { HexSocket } from '../../server';
import ChatMessage from '../../../shared/app/models/ChatMessage';

@Service({ id: 'websocket_controller', multiple: true })
export default class ChatWebsocketController implements WebsocketControllerInterface
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    onConnection(socket: HexSocket): void
    {
        socket.on('sendChat', async (gameId, content, answer) => {
            const { player } = socket.data;

            if (null === player) {
                answer('Player not found');
                return;
            }

            const chatMessage: ChatMessage = {
                persisted: false,
                gameId,
                content,
                author: player,
                createdAt: new Date(),
            };

            const result = await this.hostedGameRepository.postChatMessage(chatMessage);

            if (true !== result) {
                answer(result);
                return;
            }

            answer(true);
        });
    }
}
