/**
 * An explicit chat notification subscription of a player, on a game.
 *
 * Only games where the player explicitly subscribed or unsubscribed have an item:
 * any other game uses the default behavior
 * (player of the game: notified, observer: not notified).
 */
export type GameChatSubscriptionItem = {
    gamePublicId: string;
    enabled: boolean;
};
