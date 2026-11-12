import { Service } from 'typedi';
import { Body, Get, JsonController, NotFoundError, Param, Put } from 'routing-controllers';
import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import ChatSeenRepository from '../../../repositories/ChatSeenRepository.js';
import GameStore from '../../../store/GameStore.js';
import GameRepository from '../../../repositories/GameRepository.js';
import { ChannelNotFoundError, ChannelsService } from '../../../services/ChannelsService.js';
import { ChatSeenItem } from '../../../../shared/app/ChatSeenItem.js';

class ChatSeenBody
{
    /**
     * createdAt of the last message player has seen.
     */
    @IsDate()
    @Type(() => Date)
    seenAt: Date;
}

/**
 * Until when a player has seen a game chat or a channel,
 * used to show unread messages.
 */
@JsonController()
@Service()
export default class ChatSeenController
{
    constructor(
        private chatSeenRepository: ChatSeenRepository,
        private channelsService: ChannelsService,
        private gameStore: GameStore,
        private gameRepository: GameRepository,
    ) {}

    @Get('/api/games/:publicId/chat-seen')
    async getGameChatSeen(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<ChatSeenItem> {
        const gameId = await this.getGameId(publicId);

        // Game not yet persisted: considered as never seen
        if (gameId === null) {
            return { seenAt: null };
        }

        return {
            seenAt: await this.chatSeenRepository.getGameSeenAt(gameId, player.id!),
        };
    }

    @Put('/api/games/:publicId/chat-seen')
    async putGameChatSeen(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() body: ChatSeenBody,
    ): Promise<void> {
        const gameId = await this.getGameId(publicId);

        // Game not yet persisted: cannot store, ignore
        if (gameId === null) {
            return;
        }

        await this.chatSeenRepository.setGameSeenAt(gameId, player.id!, capToNow(body.seenAt));
    }

    @Get('/api/channels/:channelName/chat-seen')
    async getChannelChatSeen(
        @AuthenticatedPlayer() player: Player,
        @Param('channelName') channelName: string,
    ): Promise<ChatSeenItem> {
        const channelId = await this.getChannelId(channelName);

        return {
            seenAt: await this.chatSeenRepository.getChannelSeenAt(channelId, player.id!),
        };
    }

    @Put('/api/channels/:channelName/chat-seen')
    async putChannelChatSeen(
        @AuthenticatedPlayer() player: Player,
        @Param('channelName') channelName: string,
        @Body() body: ChatSeenBody,
    ): Promise<void> {
        const channelId = await this.getChannelId(channelName);

        await this.chatSeenRepository.setChannelSeenAt(channelId, player.id!, capToNow(body.seenAt));
    }

    /**
     * @returns null if game is not yet persisted (rare, e.g rematch being created)
     */
    private async getGameId(publicId: string): Promise<null | number>
    {
        const activeGame = this.gameStore.getActiveGame(publicId);

        if (activeGame !== null) {
            return activeGame.getGame().id ?? null;
        }

        const gameId = await this.gameRepository.findIdByPublicId(publicId);

        if (gameId === null) {
            throw new NotFoundError(`No game with id '${publicId}'.`);
        }

        return gameId;
    }

    private async getChannelId(channelName: string): Promise<number>
    {
        try {
            const channel = await this.channelsService.getChannel(channelName);

            return channel.id!;
        } catch (e) {
            if (e instanceof ChannelNotFoundError) {
                throw new NotFoundError(e.message);
            }

            throw e;
        }
    }
}

/**
 * Prevent setting a date in the future, which would hide next messages.
 */
const capToNow = (date: Date): Date => {
    const now = new Date();

    return date > now ? now : date;
};
