import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { ChannelChatSeen, GameChatSeen } from '../../shared/app/models/index.js';

/**
 * Stores until when a player has seen a game chat or a channel.
 */
@Service()
export default class ChatSeenRepository
{
    constructor(
        @Inject('Repository<GameChatSeen>')
        private gameChatSeenRepository: Repository<GameChatSeen>,

        @Inject('Repository<ChannelChatSeen>')
        private channelChatSeenRepository: Repository<ChannelChatSeen>,
    ) {}

    async getGameSeenAt(gameId: number, playerId: number): Promise<null | Date>
    {
        const row = await this.gameChatSeenRepository.findOneBy({ gameId, playerId });

        return row?.seenAt ?? null;
    }

    /**
     * Only moves seenAt forward.
     */
    async setGameSeenAt(gameId: number, playerId: number, seenAt: Date): Promise<void>
    {
        await this.gameChatSeenRepository.query(
            'INSERT INTO game_chat_seen (gameId, playerId, seenAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE seenAt = GREATEST(seenAt, VALUES(seenAt))',
            [gameId, playerId, seenAt],
        );
    }

    async getChannelSeenAt(channelId: number, playerId: number): Promise<null | Date>
    {
        const row = await this.channelChatSeenRepository.findOneBy({ channelId, playerId });

        return row?.seenAt ?? null;
    }

    /**
     * Only moves seenAt forward.
     */
    async setChannelSeenAt(channelId: number, playerId: number, seenAt: Date): Promise<void>
    {
        await this.channelChatSeenRepository.query(
            'INSERT INTO channel_chat_seen (channelId, playerId, seenAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE seenAt = GREATEST(seenAt, VALUES(seenAt))',
            [channelId, playerId, seenAt],
        );
    }
}
