import { Inject, Service } from 'typedi';
import { Repository } from 'typeorm';
import { Game, GameChatSubscription, Player } from '../../shared/app/models/index.js';
import { GameChatSubscriptionItem } from '../../shared/app/GameChatSubscriptionItem.js';

@Service()
export default class GameChatSubscriptionRepository
{
    constructor(
        @Inject('Repository<GameChatSubscription>')
        private repository: Repository<GameChatSubscription>,
    ) {}

    /**
     * All explicit subscriptions on a game, with their player loaded.
     */
    async findByGameId(gameId: number): Promise<GameChatSubscription[]>
    {
        return await this.repository.find({
            where: { gameId },
            relations: { player: true },
        });
    }

    /**
     * All explicit subscriptions of a player.
     * There is only a row when player explicitly subscribed or unsubscribed,
     * so this list stays small.
     */
    async findForPlayer(playerId: number): Promise<GameChatSubscriptionItem[]>
    {
        const subscriptions = await this.repository.find({
            where: { playerId },
            relations: { game: true },
        });

        return subscriptions.map(subscription => ({
            gamePublicId: subscription.game.publicId,
            enabled: subscription.enabled,
        }));
    }

    async setSubscription(game: Game, player: Player, enabled: boolean): Promise<void>
    {
        await this.repository.upsert(
            {
                gameId: game.id,
                playerId: player.id,
                enabled,
            },
            ['gameId', 'playerId'],
        );
    }

    /**
     * Subscribes player, but only if they made no explicit choice yet:
     * a player who explicitly unsubscribed stays unsubscribed.
     */
    async subscribeIfNoExplicitChoice(game: Game, player: Player): Promise<void>
    {
        await this.repository
            .createQueryBuilder()
            .insert()
            .values({
                gameId: game.id,
                playerId: player.id,
                enabled: true,
            })
            .orIgnore()
            .execute()
        ;
    }

    async removeSubscription(game: Game, player: Player): Promise<void>
    {
        await this.repository.delete({
            gameId: game.id,
            playerId: player.id,
        });
    }
}
