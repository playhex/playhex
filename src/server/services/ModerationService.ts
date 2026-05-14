import { v4 as uuidv4 } from 'uuid';
import { Inject, Service } from 'typedi';
import ChatMessageRepository from '../repositories/ChatMessageRepository.js';
import HostedGameRepository from '../repositories/HostedGameRepository.js';
import { PostPlayerModerationAction } from '../repositories/PlayerModerationActionRepository.js';
import { Repository } from 'typeorm';
import { ChatMessage, Player, PlayerModerationAction } from '../../shared/app/models/index.js';
import { notifier } from './notifications/notifier.js';

export class CreateAndSaveError extends Error {}

@Service()
export default class ModerationService
{
    constructor(
        private chatMessageRepository: ChatMessageRepository,
        private hostedGameRepository: HostedGameRepository,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<PlayerModerationAction>')
        private playerModerationActionRepository: Repository<PlayerModerationAction>,
    ) {}

    async moderateDeleteChatMessages(publicIds: string[]): Promise<{ deletedInDb: number, deletedInMemory: number }>
    {
        return {
            deletedInMemory: this.hostedGameRepository.moderateDeleteChatMessages(publicIds),
            deletedInDb: await this.chatMessageRepository.moderateDeleteChatMessages(publicIds),
        };
    }

    async createAndSaveAction(post: PostPlayerModerationAction): Promise<PlayerModerationAction>
    {
        const player = await this.playerRepository.findOneBy({ publicId: post.playerPublicId });

        if (player === null) {
            throw new CreateAndSaveError(`Player "${post.playerPublicId}" not found`);
        }

        let relatedChatMessages: ChatMessage[] = [];

        if (Array.isArray(post.relatedChatMessages) && post.relatedChatMessages.length > 0) {
            // /!\ Chat messages must be persisted in database,
            // i.e can't add a relation if message is only in memory because just posted.
            // So we need to persist hosted games containing those chat messages first.
            await this.persistGamesHavingChatMessages(post.relatedChatMessages);

            relatedChatMessages = await this.chatMessageRepository.findMultipleByPublicId(post.relatedChatMessages);
        }

        const action = new PlayerModerationAction();

        action.publicId = uuidv4();
        action.player = player;
        action.reason = post.reason ?? null;
        action.reasonDetails = post.reasonDetails ?? null;
        action.chatBlockedUntil = post.chatBlockedUntil ?? null;
        action.acknowledgedAt = null;
        action.createdAt = new Date();
        action.relatedChatMessages = relatedChatMessages;

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
        const activeGames = this.hostedGameRepository.getActiveGames();

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
