import { v4 as uuidv4 } from 'uuid';
import { Inject, Service } from 'typedi';
import ChatMessageRepository from '../repositories/ChatMessageRepository.js';
import HostedGameStore from '../store/HostedGameStore.js';
import { PostPlayerModerationAction } from '../repositories/PlayerModerationActionRepository.js';
import { Repository } from 'typeorm';
import { Player, PlayerModerationAction } from '../../shared/app/models/index.js';
import { notifier } from './notifications/notifier.js';
import ChannelChatMessageRepository from '../repositories/ChannelChatMessageRepository.js';

export class CreateAndSaveError extends Error {}

@Service()
export default class ModerationService
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameStore: HostedGameStore,
        private channelChatMessageRepository: ChannelChatMessageRepository,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerModerationAction>')
        private playerModerationActionRepository: Repository<PlayerModerationAction>,
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

        notifier.emit('moderationActionTaken', action);

        return action;
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
