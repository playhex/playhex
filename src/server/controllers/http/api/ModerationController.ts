import { Authorized, Delete, Get, JsonController, NotFoundError, Param } from 'routing-controllers';
import { Service } from 'typedi';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import { GROUP_DEFAULT, instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { ROLE_MODERATOR } from '../../../services/roles.js';

@JsonController()
@Service()
@Authorized(ROLE_MODERATOR)
export default class ModerationController
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameRepository: HostedGameRepository,
    ) {}

    @Get('/api/admin/moderation/chat-messages')
    async getLastChatMessages()
    {
        const persistedMessages = await this.chatMessageRepository.getLastChatMessages();

        const persistedPublicIds = new Set(persistedMessages.map(m => m.publicId));

        const activeMessages = this.hostedGameRepository.getActiveGamesData()
            .flatMap(game => game.chatMessages)
            .filter(m => !persistedPublicIds.has(m.publicId))
        ;

        const allMessages = [...persistedMessages, ...activeMessages];
        allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return instanceToPlain(allMessages.slice(0, 100), { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Delete('/api/admin/moderation/chat-messages/:publicId')
    async deleteModerateChatMessage(
        @Param('publicId') publicId: string,
    ) {
        const deletedInMemory = this.hostedGameRepository.moderateDeleteChatMessage(publicId);
        const deletedInDb = await this.chatMessageRepository.moderateDeleteChatMessage(publicId);

        if (!deletedInMemory && !deletedInDb) {
            throw new NotFoundError(`Chat message "${publicId}" not found`);
        }

        return {
            deletedInDb,
            deletedInMemory,
        };
    }
}
