import { Service } from 'typedi';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Authorized, Body, HttpError, JsonController, NotFoundError, Param, Post } from 'routing-controllers';
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
        private hostedGameRepository: HostedGameRepository,
        private playerRepository: PlayerRepository,
        private chatMessageRepository: ChatMessageRepository,
        private pushNotificationSender: PushNotificationSender,
    ) {}

    @Post('/api/admin/persist-games')
    async persistGames()
    {
        const allSuccess = await this.hostedGameRepository.persistPlayingGames();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }
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

        const options = new HostedGameOptions();

        options.opponentType = 'ai';
        options.opponentPublicId = ai1.publicId;
        options.ranked = true;
        options.boardsize = body.boardsize;
        options.timeControl = {
            family: 'fischer',
            options: {
                initialTime: 3600000, // Fixed time so we can compare time consumed by both ai
            },
        };

        const hostedGameServer = await this.hostedGameRepository.createGame(options);

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
