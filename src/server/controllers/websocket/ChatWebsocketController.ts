import HostedGameRepository from '../../repositories/HostedGameRepository.js';
import { Service } from 'typedi';
import { WebsocketControllerInterface } from './index.js';
import { HexSocket } from '../../server.js';
import ChatMessage from '../../../shared/app/models/ChatMessage.js';

@Service()
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

            const chatMessage = new ChatMessage();

            chatMessage.player = player;
            chatMessage.content = content;
            chatMessage.createdAt = new Date();

            const result = await this.hostedGameRepository.postChatMessage(gameId, chatMessage);

            if (true !== result) {
                answer(result);
                return;
            }

            answer(true);
        });
    }
}
