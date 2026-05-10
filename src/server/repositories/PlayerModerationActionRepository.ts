import { Inject, Service } from 'typedi';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, Player, PlayerModerationAction } from '../../shared/app/models/index.js';
import { PostPlayerModerationAction } from '../../shared/app/playerModerationActionUtils.js';
import { notifier } from '../services/notifications/notifier.js';

export { PostPlayerModerationAction };

export class CreateAndSaveError extends Error {}
export class PlayerNotExistingError extends Error {}

@Service()
export default class PlayerModerationActionRepository
{
    constructor(
        @Inject('Repository<PlayerModerationAction>')
        private playerModerationActionRepository: Repository<PlayerModerationAction>,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,

        @Inject('Repository<ChatMessage>')
        private chatMessageRepository: Repository<ChatMessage>,
    ) {}

    async createAndSave(post: PostPlayerModerationAction): Promise<PlayerModerationAction>
    {
        const player = await this.playerRepository.findOneBy({ publicId: post.playerPublicId });

        if (player === null) {
            throw new CreateAndSaveError(`Player "${post.playerPublicId}" not found`);
        }

        const relatedChatMessages = post.relatedChatMessages?.length
            ? await this.chatMessageRepository.findBy({ publicId: In(post.relatedChatMessages) })
            : []
        ;

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
     * Get unacknowledged moderation actions for a player.
     *
     * @withPastActions Defaults to false. If true, also include actions that player already acknowledged.
     */
    async findActionsForPlayer(player: Player, withPastActions?: boolean): Promise<PlayerModerationAction[]>
    {
        return await this.playerModerationActionRepository.find({
            where: {
                player: { id: player.id },
                acknowledgedAt: withPastActions ? undefined : IsNull(),
            },
            relations: {
                relatedChatMessages: {
                    hostedGame: true,
                    player: true,
                },
            },
            order: { createdAt: 'desc' },
        });
    }

    async acknowledgeActionForPlayer(player: Player, publicId: string): Promise<void>
    {
        if (!player.id) {
            throw new Error('Unexpected player without id');
        }

        const playerExists = await this.playerRepository.existsBy({
            id: player.id,
        });

        if (!playerExists) {
            throw new PlayerNotExistingError(`Player with id "${player.id}" not found`);
        }

        await this.playerModerationActionRepository.update({
            publicId,
            player: { id: player.id },
            acknowledgedAt: IsNull(),
        }, {
            acknowledgedAt: new Date(),
        });
    }

    async isCurrentlyChatRestricted(playerPublicId: string): Promise<boolean>
    {
        return await this.playerModerationActionRepository.existsBy({
            player: { publicId: playerPublicId },
            chatBlockedUntil: MoreThan(new Date()),
        });
    }
}
