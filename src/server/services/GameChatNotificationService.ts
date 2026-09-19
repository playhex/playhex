import { Service } from 'typedi';
import { Game, Player } from '../../shared/app/models/index.js';
import { getPlayers, hasPlayer } from '../../shared/app/gameUtils.js';
import GameChatSubscriptionRepository from '../repositories/GameChatSubscriptionRepository.js';

@Service()
export default class GameChatNotificationService
{
    constructor(
        private gameChatSubscriptionRepository: GameChatSubscriptionRepository,
    ) {}

    /**
     * Posting in a game chat subscribes the author to this game chat,
     * so they get notified of the answers even if they are not a player of this game.
     *
     * Does nothing if they already made an explicit choice,
     * so a player who unsubscribed is not resubscribed by posting.
     */
    async autoSubscribeAuthor(game: Game, player: Player): Promise<void>
    {
        // Game is not yet persisted, subscription cannot be stored
        if (typeof game.id !== 'number') {
            return;
        }

        // Players of the game are notified by default, no need for a row
        if (hasPlayer(game, player)) {
            return;
        }

        await this.gameChatSubscriptionRepository.subscribeIfNoExplicitChoice(game, player);
    }

    /**
     * Players who should be notified when a chat message is posted on this game.
     *
     * By default, players of the game are notified, and observers are not.
     * A player can override this default by explicitly subscribing or unsubscribing,
     * which creates a row in game_chat_subscription.
     */
    async getChatNotificationRecipients(game: Game): Promise<Player[]>
    {
        // Game is not yet persisted, so there cannot be any subscription on it
        if (typeof game.id !== 'number') {
            return getPlayers(game);
        }

        const subscriptions = await this.gameChatSubscriptionRepository.findByGameId(game.id);
        const enabledByPlayerId = new Map(subscriptions.map(({ playerId, enabled }) => [playerId, enabled]));

        const recipients: Player[] = getPlayers(game)
            .filter(player => enabledByPlayerId.get(player.id!) !== false)
        ;

        const gamePlayerIds = new Set(getPlayers(game).map(player => player.id));

        for (const subscription of subscriptions) {
            if (!subscription.enabled) {
                continue;
            }

            // Players of the game are already handled above
            if (gamePlayerIds.has(subscription.playerId)) {
                continue;
            }

            recipients.push(subscription.player);
        }

        return recipients;
    }
}
