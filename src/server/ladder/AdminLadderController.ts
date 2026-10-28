import { Authorized, Body, HttpError, JsonController, Param, Post } from 'routing-controllers';
import { Service } from 'typedi';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { instanceToPlain } from '../../shared/app/class-transformer-custom.js';
import { ChatMessage, Player } from '../../shared/app/models/index.js';
import { pseudoString } from '../../shared/app/pseudoUtils.js';
import GameStore from '../store/GameStore.js';
import { ROLE_ADMIN } from '../services/roles.js';
import LadderService from './LadderService.js';

class ReportCheatInput
{
    /**
     * Sent to the cheater in their notification.
     */
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    reason: string;
}

@JsonController()
@Service()
@Authorized(ROLE_ADMIN)
export default class AdminLadderController
{
    constructor(
        private ladderService: LadderService,
        private gameStore: GameStore,
    ) {}

    /**
     * Player cheated in this ladder game: tags player as cheater, voids game result,
     * cheater moves to the last seat, victim gets back their seat (unless they now sit higher).
     * Both players are notified, game becomes unranked (ratings not recomputed),
     * and a system message is posted in game chat.
     * Game must be over: cancel or forfeit it before if still playing.
     *
     * @example
     * curl -X POST -H 'Authorization: Bearer <ADMIN_PASSWORD>' -H 'Content-Type: application/json' \
     *     -d '{"reason":"Used an AI during the game"}' \
     *     http://localhost:3000/api/admin/ladder/games/<gamePublicId>/players/<playerPublicId>/cheat
     */
    @Post('/api/admin/ladder/games/:gamePublicId/players/:playerPublicId/cheat')
    async reportCheat(
        @Param('gamePublicId') gamePublicId: string,
        @Param('playerPublicId') playerPublicId: string,
        @Body() input: ReportCheatInput,
    ) {
        const { challenge, cheater } = await this.ladderService.reportCheat(gamePublicId, playerPublicId, input.reason);

        await this.gameStore.unrankGame(gamePublicId);

        const result = await this.gameStore.postChatMessage(gamePublicId, this.createCheatChatMessage(cheater));

        if (result !== true) {
            throw new HttpError(500, `Cheat reported, but could not post chat message: ${result}`);
        }

        return instanceToPlain(challenge);
    }

    /**
     * Excludes player from the ladder,
     * can rejoin after same delay as when removed for timeouts.
     *
     * @example
     * curl -X POST -H 'Authorization: Bearer <ADMIN_PASSWORD>' \
     *     http://localhost:3000/api/admin/ladders/main/players/<playerPublicId>/exclude
     */
    @Post('/api/admin/ladders/:slug/players/:playerPublicId/exclude')
    async exclude(
        @Param('slug') slug: string,
        @Param('playerPublicId') playerPublicId: string,
    ) {
        const ladder = await this.ladderService.getLadderBySlug(slug);

        return instanceToPlain(await this.ladderService.exclude(ladder, playerPublicId));
    }

    private createCheatChatMessage(cheater: Player): ChatMessage
    {
        const chatMessage = new ChatMessage();
        const player = pseudoString(cheater);

        chatMessage.player = null;
        chatMessage.content = `A moderator detected cheating by ${player}. This game is no longer ranked, and its King of the Hill result has been canceled.`;
        chatMessage.contentTranslationKey = 'ladder.cheat_chat_message';
        chatMessage.translationParameters = { player };
        chatMessage.createdAt = new Date();

        return chatMessage;
    }
}
