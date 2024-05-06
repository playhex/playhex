import { Body, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthenticatedPlayer } from '../middlewares';
import Player from '../../../../shared/app/models/Player';
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
