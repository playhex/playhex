import { Authorized, BadRequestError, Body, Delete, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import PlayerModerationActionRepository, { CreateAndSaveError, PostPlayerModerationAction } from '../../../repositories/PlayerModerationActionRepository.js';
import ModerationService from '../../../services/ModerationService.js';
import { GROUP_DEFAULT, instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { ROLE_MODERATOR } from '../../../services/roles.js';

@JsonController()
@Service()
@Authorized(ROLE_MODERATOR)
export default class AdminModerationController
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameRepository: HostedGameRepository,
        private playerModerationActionRepository: PlayerModerationActionRepository,
        private moderationService: ModerationService,
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
        const { deletedInDb, deletedInMemory } = await this.moderationService.moderateDeleteChatMessages([publicId]);

        if (!deletedInMemory && !deletedInDb) {
            throw new NotFoundError(`Chat message "${publicId}" not found`);
        }

        return {
            deletedInDb,
            deletedInMemory,
        };
    }

    @Post('/api/admin/moderation/action')
    async postPlayerModerationAction(
        @Body() postPlayerModerationAction: PostPlayerModerationAction,
    ) {
        try {
            if (postPlayerModerationAction.relatedChatMessages && postPlayerModerationAction.relatedChatMessages.length > 0) {
                await this.moderationService.moderateDeleteChatMessages(postPlayerModerationAction.relatedChatMessages);
            }

            return await this.playerModerationActionRepository.createAndSave(postPlayerModerationAction);
        } catch (e) {
            if (e instanceof CreateAndSaveError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }
}
