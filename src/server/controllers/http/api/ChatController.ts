import { Body, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares';
import { PlayerData } from '../../../../shared/app/Types';
import ChatMessage from '../../../../shared/app/models/ChatMessage';
import HostedGameRepository from '../../../repositories/HostedGameRepository';
import HttpError from '../HttpError';

@JsonController()
@Service()
export default class ChatController
{
    constructor(
        private hostedGameRepository: HostedGameRepository,
    ) {}

    @Post('/api/games/:gameId/chat-messages')
    async post(
        @AuthenticatedPlayer() playerData: PlayerData,
        @Param('gameId') gameId: string,
        @Body({ validate: { groups: ['playerInput'] } }) chatMessage: ChatMessage,
    ) {
        chatMessage.author = playerData;
        chatMessage.gameId = gameId;
        chatMessage.createdAt = new Date();

        const result = await this.hostedGameRepository.postChatMessage(chatMessage);

        if (true !== result) {
            throw new HttpError(400, result);
        }
    }
}
