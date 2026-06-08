import { v4 as uuidv4 } from 'uuid';
import { Inject, Service } from 'typedi';
import ChatMessageRepository from '../repositories/ChatMessageRepository.js';
import HostedGameStore from '../store/HostedGameStore.js';
import { PostPlayerModerationAction } from '../repositories/PlayerModerationActionRepository.js';
import { Repository } from 'typeorm';
import { Player, PlayerIp, PlayerModerationAction } from '../../shared/app/models/index.js';
import { notifier } from './notifications/notifier.js';
import ChannelChatMessageRepository from '../repositories/ChannelChatMessageRepository.js';
import PlayerAvatarService from './PlayerAvatarService.js';
import BannedIpService from './BannedIpService.js';
import logger from './logger.js';

export class CreateAndSaveError extends Error {}

const MODERATION_REASONS: Record<string, string> = {
    'moderation_reason.chat_insults': 'Insults or inappropriate behavior in chat',
    'moderation_reason.avatar_inappropriate': 'Inappropriate avatar image',
    'moderation_reason.nickname_inappropriate': 'Inappropriate nickname',
};

@Service()
export default class ModerationService
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameStore: HostedGameStore,
        private channelChatMessageRepository: ChannelChatMessageRepository,
        private playerAvatarService: PlayerAvatarService,
        private bannedIpService: BannedIpService,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerModerationAction>')
        private playerModerationActionRepository: Repository<PlayerModerationAction>,

        @Inject('Repository<PlayerIp>')
        private playerIpRepository: Repository<PlayerIp>,
    ) {}

    async moderateDeleteChatMessages(publicIds: string[]): Promise<{ deletedInDb: number, deletedInMemory: number, deletedInChannels: number }>
    {
        return {
            deletedInMemory: this.hostedGameStore.moderateDeleteChatMessages(publicIds),
            deletedInDb: await this.chatMessageRepository.moderateDeleteChatMessages(publicIds),
            deletedInChannels: await this.channelChatMessageRepository.moderateDeleteChatMessages(publicIds),
        };
    }

    async createAndSaveAction(post: PostPlayerModerationAction): Promise<PlayerModerationAction>
    {
        const player = await this.playerRepository.findOneBy({ publicId: post.playerPublicId });

        if (player === null) {
            throw new CreateAndSaveError(`Player "${post.playerPublicId}" not found`);
        }

        const action = new PlayerModerationAction();

        action.publicId = uuidv4();
        action.player = player;
        action.reason = post.reason ?? null;
        action.reasonDetails = post.reasonDetails ?? null;
        action.chatBlockedUntil = post.chatBlockedUntil ?? null;
        action.avatarBlockedUntil = post.avatarBlockedUntil ?? null;
        action.nicknameModerated = post.moderateNickname ?? null;
        action.ipBannedUntil = post.ipBannedUntil ?? null;
        action.acknowledgedAt = null;
        action.createdAt = new Date();
        action.relatedChatMessages = [];
        action.relatedChannelChatMessages = [];

        if (Array.isArray(post.relatedChatMessages) && post.relatedChatMessages.length > 0) {
            // /!\ Chat messages must be persisted in database,
            // i.e can't add a relation if message is only in memory because just posted.
            // So we need to persist hosted games containing those chat messages first.
            await this.persistGamesHavingChatMessages(post.relatedChatMessages);

            // Chat messages
            action.relatedChatMessages = await this.chatMessageRepository.findMultipleByPublicId(post.relatedChatMessages);

            // Channel chat messages
            action.relatedChannelChatMessages = await this.channelChatMessageRepository.findMultipleByPublicId(post.relatedChatMessages);
        }

        await this.playerModerationActionRepository.save(action);

        if (action.ipBannedUntil) {
            await this.banPlayerIps(player, action);
        }

        if (action.avatarBlockedUntil) {
            await this.playerAvatarService.deleteAvatar(player.avatarPath, player.avatarThumbnailPath).catch(reason => {
                logger.notice('Error while deleting moderated avatar', { reason });
            });
            await this.playerRepository.update({ id: player.id }, { avatarPath: null, avatarThumbnailPath: null, avatarUpdatedAt: null });
        }

        notifier.emit('moderationActionTaken', action);

        return action;
    }

    private async banPlayerIps(player: Player, action: PlayerModerationAction): Promise<void>
    {
        const ips = await this.playerIpRepository.find({
            where: { player: { id: player.id } },
        });

        if (!ips.length) return;

        const parts: string[] = [];

        if (action.reason) parts.push(`reason: ${MODERATION_REASONS[action.reason] ?? action.reason}`);
        if (action.reasonDetails) parts.push(`details: ${action.reasonDetails}`);

        const messages = [
            ...action.relatedChatMessages.map(m => m.player?.pseudo ? `${m.player.pseudo}: ${m.content}` : null),
            ...action.relatedChannelChatMessages.map(m => m.player?.pseudo ? `${m.player.pseudo}: ${m.content}` : null),
        ].filter(Boolean) as string[];

        if (messages.length) {
            parts.push(`messages:\n${messages.map(m => `- ${m}`).join('\n')}`);
        }

        const reason = parts.join('\n') || 'moderated';

        await Promise.all(
            ips.map(({ ip }) => this.bannedIpService.banIp(ip, action.ipBannedUntil!, reason)),
        );
    }

    /**
     * Persist hosted games containing at least one of given chat messages.
     * Needed to have a chat message id in database.
     */
    async persistGamesHavingChatMessages(chatMessagePublicIds: string[]): Promise<void>
    {
        const activeGames = this.hostedGameStore.getActiveGames();

        for (const key in activeGames) {
            const activeGame = activeGames[key];
            const hostedGame = activeGame.getHostedGame();

            for (const chatMessage of hostedGame.chatMessages) {
                if (chatMessage.id) {
                    continue;
                }

                if (chatMessagePublicIds.includes(chatMessage.publicId)) {
                    await activeGame.persist();
                    break;
                }
            }
        }
    }
}
