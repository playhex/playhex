import { Inject, Service } from 'typedi';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Player, PlayerModerationAction } from '../../shared/app/models/index.js';
import { PostPlayerModerationAction } from '../../shared/app/playerModerationActionUtils.js';

export { PostPlayerModerationAction };

export class PlayerNotExistingError extends Error {}

@Service()
export default class PlayerModerationActionRepository
{
    constructor(
        @Inject('Repository<PlayerModerationAction>')
        private playerModerationActionRepository: Repository<PlayerModerationAction>,

        @Inject('Repository<Player>')
        private playerRepository: Repository<Player>,
    ) {}

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
                player: true,
                relatedChatMessages: {
                    hostedGame: true,
                    player: true,
                },
                relatedChannelChatMessages: {
                    channel: true,
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

    async getLastActions(limit = 100): Promise<PlayerModerationAction[]>
    {
        return await this.playerModerationActionRepository.find({
            relations: {
                player: true,
                relatedChatMessages: {
                    hostedGame: true,
                    player: true,
                },
                relatedChannelChatMessages: {
                    channel: true,
                    player: true,
                },
            },
            order: { createdAt: 'desc' },
            take: limit,
        });
    }

    async isCurrentlyChatRestricted(playerPublicId: string): Promise<boolean>
    {
        return await this.playerModerationActionRepository.existsBy({
            player: { publicId: playerPublicId },
            chatBlockedUntil: MoreThan(new Date()),
        });
    }

    async isCurrentlyAvatarRestricted(playerPublicId: string): Promise<boolean>
    {
        return await this.playerModerationActionRepository.existsBy({
            player: { publicId: playerPublicId },
            avatarBlockedUntil: MoreThan(new Date()),
        });
    }
}
