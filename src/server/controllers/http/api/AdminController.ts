import { Service } from 'typedi';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import { PreRenderedService } from '../../../services/PreRenderedService.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Authorized, Body, Delete, HttpError, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
import { Player, HostedGameOptions } from '../../../../shared/app/models/index.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils.js';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import { PushNotificationSender } from '../../../services/PushNotificationsSender.js';
import { PushPayload } from '../../../../shared/app/PushPayload.js';

class CreateAiVsAiInput
{
    @IsString()
    ai0Slug: string;

    @IsString()
    ai1Slug: string;

    @IsNumber()
    @Min(RANKED_BOARDSIZE_MIN)
    @Max(RANKED_BOARDSIZE_MAX)
    boardsize: number = 11;
}

@JsonController()
@Service()
@Authorized('ADMIN')
export default class AdminController
{
    constructor(
        private preRenderedService: PreRenderedService,
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
        private chatMessageRepository: ChatMessageRepository,
        private pushNotificationSender: PushNotificationSender,
    ) {}

    /**
     * Reset pre rendered pages in cache.
     */
    @Delete('/api/admin/pre-rendered-pages-cache')
    async deletePreRenderedPagesCache()
    {
        await this.preRenderedService.preloadTemplatesInMemory();
    }

    @Post('/api/admin/persist-games')
    async persistGames()
    {
        const allSuccess = await this.hostedGameRepository.persistPlayingGames();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }
    }

    @Post('/api/admin/games/:hostedGamePublicId/players/:playerPublicId/forfeit')
    async forfeitGame(
        @Param('hostedGamePublicId') hostedGamePublicId: string,
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const activeGame = this.hostedGameRepository.getActiveGame(hostedGamePublicId);

        if (!activeGame) {
            throw new HttpError(400, 'No active game with this public id');
        }

        const player = activeGame.getPlayerByPublicId(playerPublicId);

        if (!player) {
            throw new HttpError(400, 'This game has no player with this public id');
        }

        activeGame.systemForfeit(player);
    }

    @Post('/api/admin/create-ai-vs-ai')
    async createAIvsAI(
        @Body() body: CreateAiVsAiInput,
    ) {
        const findAIBySlug = async (slug: string): Promise<Player> => {
            const ai = await this.playerRepository.getAIPlayerBySlug(slug);

            if (null === ai) {
                throw new HttpError(400, `No AI with slug '${slug}'.`);
            }

            return ai;
        };

        const ai0 = await findAIBySlug(body.ai0Slug);
        const ai1 = await findAIBySlug(body.ai1Slug);

        const gameOptions = new HostedGameOptions();

        gameOptions.opponentType = 'ai';
        gameOptions.opponentPublicId = ai1.publicId;
        gameOptions.ranked = true;
        gameOptions.boardsize = body.boardsize;
        gameOptions.timeControl = {
            family: 'fischer',
            options: {
                initialTime: 3600000, // Fixed time so we can compare time consumed by both ai
            },
        };

        const hostedGameServer = await this.hostedGameRepository.createGame({ gameOptions });

        hostedGameServer.playerJoin(ai0);
        hostedGameServer.playerJoin(ai1);

        return hostedGameServer.getHostedGame();
    }

    @Post('/api/admin/players/:publicId/shadow-ban')
    async shadowBanPlayer(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        const playerShadowBanned = await this.playerRepository.shadowBan(publicId);
        const shadowDeletedChatMessagesInActiveGames = this.hostedGameRepository.shadowDeletePlayerChatMessages(publicId);
        const shadowDeletedChatMessagesInPersistedGames = await this.chatMessageRepository.shadowDeletePlayerMessages(player);

        return {
            playerShadowBanned,
            shadowDeletedChatMessagesInActiveGames,
            shadowDeletedChatMessagesInPersistedGames,
        };
    }

    @Post('/api/admin/players/:publicId/push-notification')
    async postPush(
        @Param('publicId') publicId: string,
        @Body() payload: PushPayload,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (null === player) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        return await this.pushNotificationSender.sendPush(player, payload);
    }
}
