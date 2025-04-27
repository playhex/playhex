import { Body, HttpError, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares.js';
import { ChatMessage, Player } from '../../../../shared/app/models/index.js';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';

@JsonController()
@Service()
export default class ChatController
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    @Post('/api/games/:gameId/chat-messages')
    async post(
        @AuthenticatedPlayer() player: Player,
        @Param('gameId') gameId: string,
        @Body({ validate: { groups: ['playerInput'] } }) chatMessage: ChatMessage,
    ) {
        chatMessage.player = player;
        chatMessage.createdAt = new Date();

        const result = await this.hostedGameRepository.postChatMessage(gameId, chatMessage);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }
}
