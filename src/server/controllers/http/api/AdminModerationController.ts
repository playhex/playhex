import { Authorized, BadRequestError, Body, Delete, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import PlayerModerationActionRepository, { PostPlayerModerationAction } from '../../../repositories/PlayerModerationActionRepository.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import ModerationService, { CreateAndSaveError } from '../../../services/ModerationService.js';
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
        private playerRepository: PlayerRepository,
        private moderationService: ModerationService,
    ) {}

    @Get('/api/admin/moderation/players')
    async getLastRegisteredPlayers()
    {
        const players = await this.playerRepository.getLastRegisteredPlayers(100);

        return instanceToPlain(players, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Get('/api/admin/moderation/players/:publicId')
    async getModerationPlayer(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        return instanceToPlain(player, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Get('/api/admin/moderation/players/:publicId/actions')
    async getPlayerModerationActions(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        const actions = await this.playerModerationActionRepository.findActionsForPlayer(player, true);

        return instanceToPlain(actions, { groups: [GROUP_DEFAULT, 'player_moderation_action'] });
    }

    @Get('/api/admin/moderation/chat-messages')
    async getLastChatMessages()
    {
        const LIMIT = 200;

        const persistedMessages = await this.chatMessageRepository.getLastChatMessagesForModeration(LIMIT);
        const inMemoryMessages = this.hostedGameRepository.getUnpersistedChatMessagesForModeration();

        const allMessages = [...inMemoryMessages, ...persistedMessages];
        allMessages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return instanceToPlain(allMessages.slice(0, LIMIT), { groups: [GROUP_DEFAULT, 'moderation'] });
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

            return await this.moderationService.createAndSaveAction(postPlayerModerationAction);
        } catch (e) {
            if (e instanceof CreateAndSaveError) {
                throw new BadRequestError(e.message);
            }

            throw e;
        }
    }
}
