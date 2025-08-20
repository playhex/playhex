import { Service } from 'typedi';
import { IsNumber, IsString, Max, Min } from 'class-validator';
import HostedGameRepository from '../../../repositories/HostedGameRepository.js';
import { PreRenderedService } from '../../../services/PreRenderedService.js';
import PlayerRepository from '../../../repositories/PlayerRepository.js';
import { Authorized, Body, Delete, HttpError, JsonController, NotFoundError, Param, Patch, Post } from 'routing-controllers';
import { Player, HostedGameOptions, Tournament } from '../../../../shared/app/models/index.js';
import { RANKED_BOARDSIZE_MAX, RANKED_BOARDSIZE_MIN } from '../../../../shared/app/ratingUtils.js';
import ChatMessageRepository from '../../../repositories/ChatMessageRepository.js';
import { PushNotificationSender } from '../../../services/PushNotificationsSender.js';
import { PushPayload } from '../../../../shared/app/PushPayload.js';
import TournamentRepository from '../../../repositories/TournamentRepository.js';
import { GROUP_DEFAULT, instanceToPlain } from '../../../../shared/app/class-transformer-custom.js';
import { GameStaleEvaluator } from '../../../services/auto-cancel-stale-games/GameStaleEvaluator.js';
import { AutoCancelStaleGames } from '../../../services/auto-cancel-stale-games/AutoCancelStaleGames.js';

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
        private tournamentRepository: TournamentRepository,
        private playerRepository: PlayerRepository,
        private chatMessageRepository: ChatMessageRepository,
        private pushNotificationSender: PushNotificationSender,
        private gameStaleEvaluator: GameStaleEvaluator,
        private autoCancelStaleGames: AutoCancelStaleGames,
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

            if (ai === null) {
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

        hostedGameServer.playerJoin(ai0, true);
        hostedGameServer.playerJoin(ai1, true);

        return hostedGameServer.getHostedGame();
    }

    @Post('/api/admin/players/:publicId/shadow-ban')
    async shadowBanPlayer(
        @Param('publicId') publicId: string,
    ) {
        const player = await this.playerRepository.getPlayer(publicId);

        if (player === null) {
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

        if (player === null) {
            throw new NotFoundError(`Player "${publicId}" not found`);
        }

        return await this.pushNotificationSender.sendPush(player, payload);
    }

    @Post('/api/admin/games/:publicId/cancel')
    async cancelGame(
        @Param('publicId') publicId: string,
    ) {
        const hostedGameServer = this.hostedGameRepository.getActiveGame(publicId);

        if (hostedGameServer === null) {
            throw new NotFoundError(`HostedGame "${publicId}" not found`);
        }

        hostedGameServer.systemCancel();
    }

    @Post('/api/admin/persist-tournaments')
    async persistTournaments()
    {
        const allSuccess = await this.tournamentRepository.persistAllTournaments();

        if (!allSuccess) {
            throw new HttpError(500, 'Some games could not be persisted');
        }
    }

    @Patch('/api/admin/tournaments/:slug')
    async editTournament(
        @Param('slug') slug: string,
        @Body({
            validate: { groups: ['tournament:admin:edit'] },
            transform: { groups: ['tournament:admin:edit'] },
        }) edited: Tournament,
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        return instanceToPlain(await activeTournament.editTournamentAdmin(edited), {
            groups: [GROUP_DEFAULT, 'tournament:admin:edit'],
        });
    }

    @Post('/api/admin/tournaments/:slug/iterate')
    async iterateTournament(
        @Param('slug') slug: string,
    ) {
        const activeTournament = this.tournamentRepository.getActiveTournamentBySlug(slug);

        if (activeTournament === null) {
            throw new NotFoundError(`No active tournament "${slug}"`);
        }

        await activeTournament.iterateTournament();

        return await activeTournament.save();
    }

    @Post('/api/admin/games/debug-staleness')
    async postDebugStalenessAllGames()
    {
        return this.autoCancelStaleGames.checkAllGames(false);
    }

    @Post('/api/admin/games/:hostedGamePublicId/debug-staleness')
    async postDebugStaleness(
        @Param('hostedGamePublicId') hostedGamePublicId: string,
    ) {
        const activeGame = this.hostedGameRepository.getActiveGame(hostedGamePublicId);

        if (!activeGame) {
            throw new HttpError(400, 'No active game with this public id');
        }

        return this.gameStaleEvaluator.isStale(activeGame);
    }
}
