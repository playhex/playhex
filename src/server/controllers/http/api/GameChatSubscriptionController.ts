import { Service } from 'typedi';
import { Body, Delete, Get, HttpError, JsonController, NotFoundError, Param, Put } from 'routing-controllers';
import { IsBoolean } from 'class-validator';
import { Game, Player } from '../../../../shared/app/models/index.js';
import { AuthenticatedPlayer } from '../middlewares.js';
import GameStore from '../../../store/GameStore.js';
import GameChatSubscriptionRepository from '../../../repositories/GameChatSubscriptionRepository.js';
import { GameChatSubscriptionItem } from '../../../../shared/app/GameChatSubscriptionItem.js';

class GameChatSubscriptionBody
{
    @IsBoolean()
    enabled: boolean;
}

@JsonController()
@Service()
export default class GameChatSubscriptionController
{
    constructor(
        private gameChatSubscriptionRepository: GameChatSubscriptionRepository,
        private gameStore: GameStore,
    ) {}

    /**
     * Subscriptions are keyed on the game database id,
     * so the game must already have been persisted.
     */
    private async getPersistedGame(publicId: string): Promise<Game>
    {
        const game = await this.gameStore.getActiveOrArchivedGame(publicId);

        if (game === null) {
            throw new NotFoundError(`No game with id '${publicId}'.`);
        }

        if (typeof game.id !== 'number') {
            throw new HttpError(409, `Game '${publicId}' is not yet persisted.`);
        }

        return game;
    }

    /**
     * Only explicit subscriptions are returned:
     * a game missing from this list uses the default behavior.
     */
    @Get('/api/game-chat-subscriptions')
    async getSubscriptions(
        @AuthenticatedPlayer() player: Player,
    ): Promise<GameChatSubscriptionItem[]> {
        return await this.gameChatSubscriptionRepository.findForPlayer(player.id!);
    }

    @Put('/api/games/:publicId/chat-subscription')
    async putSubscription(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
        @Body() body: GameChatSubscriptionBody,
    ): Promise<void> {
        const game = await this.getPersistedGame(publicId);

        await this.gameChatSubscriptionRepository.setSubscription(game, player, body.enabled);
    }

    /**
     * Removes the explicit subscription, so player goes back to default behavior.
     */
    @Delete('/api/games/:publicId/chat-subscription')
    async deleteSubscription(
        @AuthenticatedPlayer() player: Player,
        @Param('publicId') publicId: string,
    ): Promise<void> {
        const game = await this.getPersistedGame(publicId);

        await this.gameChatSubscriptionRepository.removeSubscription(game, player);
    }
}
