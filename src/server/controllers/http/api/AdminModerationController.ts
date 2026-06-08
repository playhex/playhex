import { Authorized, BadRequestError, Body, Delete, Get, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import HostedGameStore from '../../../store/HostedGameStore.js';
import PlayerModerationActionRepository, { PostPlayerModerationAction } from '../../../repositories/PlayerModerationActionRepository.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import ModerationService, { CreateAndSaveError } from '../../../services/ModerationService.js';
import { GROUP_DEFAULT, instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { ROLE_MODERATOR } from '../../../services/roles.js';
import { HostedGame } from '../../../../shared/app/models/index.js';
import type AbstractChatMessage from '../../../../shared/app/models/AbstractChatMessage.js';
import ChannelChatMessageRepository from '../../../repositories/ChannelChatMessageRepository.js';
import PlayerIpService from '../../../services/PlayerIpService.js';
import BannedIpService from '../../../services/BannedIpService.js';

type MessageFromAnySource =
    { message: AbstractChatMessage, source: 'game', data: HostedGame }
    | { message: AbstractChatMessage, source: 'channel', data: string }
;

@JsonController()
@Service()
@Authorized(ROLE_MODERATOR)
export default class AdminModerationController
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameStore: HostedGameStore,
        private playerModerationActionRepository: PlayerModerationActionRepository,
        private playerRepository: PlayerRepository,
        private moderationService: ModerationService,
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private playerIpService: PlayerIpService,
        private bannedIpService: BannedIpService,
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

    @Get('/api/admin/moderation/banned-ips')
    async getBannedIps()
    {
        return await this.bannedIpService.getActiveBans();
    }

    @Get('/api/admin/moderation/players/:publicId/ips')
    async getPlayerIps(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (!player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        const ips = await this.playerIpService.getIpsForPlayerWithOthers(player);

        return ips.map(({ ip, lastUsedAt, otherPlayers }) => ({
            ip,
            lastUsedAt,
            otherPlayers: instanceToPlain(otherPlayers, { groups: [GROUP_DEFAULT] }),
        }));
    }

    /**
     * Get all recent chat messages from any source (game or channel).
     *
     * @returns Last messages, most recent first, like: [
     *  { message: { ... }, source: 'game', sourceId: '123abc...' },
     *  { message: { ... }, source: 'channel', sourceId: 'lobby-en...' },
     * ]
     */
    @Get('/api/admin/moderation/chat-messages')
    async getLastChatMessages(): Promise<MessageFromAnySource[]>
    {
        const SINCE = new Date(new Date().getTime() - 86400000 * 14); // 2 weeks of history

        const persistedMessages = await this.chatMessageRepository.getLastChatMessagesForModeration(SINCE);
        const inMemoryMessages = this.hostedGameStore.getUnpersistedChatMessagesForModeration();
        const channelMessages = await this.channelChatMessageRepository.getLastMessagesForModeration(SINCE);

        const allMessages: MessageFromAnySource[] = [];

        for (const message of persistedMessages) {
            allMessages.push({
                source: 'game',
                message: instanceToPlain(message, { groups: [GROUP_DEFAULT, 'moderation'] }),
                data: instanceToPlain(message.hostedGame, { groups: ['moderation'] }),
            });
        }

        for (const message of inMemoryMessages) {
            allMessages.push({
                source: 'game',
                message: instanceToPlain(message, { groups: [GROUP_DEFAULT, 'moderation'] }),
                data: instanceToPlain(message.hostedGame, { groups: ['moderation'] }),
            });
        }

        for (const message of channelMessages) {
            allMessages.push({
                source: 'channel',
                message: instanceToPlain(message, { groups: [GROUP_DEFAULT, 'moderation'] }),
                data: message.channel.name,
            });
        }

        allMessages.sort((a, b) => b.message.createdAt.getTime() - a.message.createdAt.getTime());

        return allMessages;
    }

    @Get('/api/admin/moderation/actions')
    async getLastModerationActions()
    {
        const actions = await this.playerModerationActionRepository.getLastActions(100);

        return instanceToPlain(actions, { groups: [GROUP_DEFAULT, 'player_moderation_action'] });
    }

    @Get('/api/admin/moderation/avatar-uploads')
    async getLastAvatarUploads()
    {
        const players = await this.playerRepository.getLastAvatarUploads(100);

        return instanceToPlain(players, { groups: [GROUP_DEFAULT, 'moderation'] });
    }

    @Delete('/api/admin/moderation/chat-messages/:publicId')
    async deleteModerateChatMessage(
        @Param('publicId') publicId: string,
    ) {
        const { deletedInDb, deletedInMemory, deletedInChannels } = await this.moderationService.moderateDeleteChatMessages([publicId]);

        if (!deletedInMemory && !deletedInDb && !deletedInChannels) {
            throw new NotFoundError(`Chat message "${publicId}" not found`);
        }

        return {
            deletedInDb,
            deletedInMemory,
            deletedInChannels,
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

            if (postPlayerModerationAction.moderateNickname) {
                const player = await this.playerRepository.getPlayer(postPlayerModerationAction.playerPublicId);

                if (!player) {
                    throw new NotFoundError(`Player "${postPlayerModerationAction.playerPublicId}" not found`);
                }

                await this.playerRepository.moderateNickname(player);
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
