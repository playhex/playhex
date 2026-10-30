import { Game } from './models/index.js';
import PlayerNotification from './models/PlayerNotification.js';

/**
 * Max unread notifications loaded in the header.
 * If player has more, badge displays "50+".
 */
export const UNREAD_PLAYER_NOTIFICATIONS_LIMIT = 50;

export type GamePlayerNotifications = {
    /**
     * From which game notifications are from.
     * Null if it does not come from a game.
     */
    game: null | Game;

    playerNotifications: PlayerNotification[];
};

/**
 * Groups consecutive player notifications from the same game.
 * A same game can appear in multiple groups
 * if its notifications are not consecutive.
 */
export const groupPlayerNotificationByGame = (playerNotifications: PlayerNotification[]): GamePlayerNotifications[] => {
    const result: GamePlayerNotifications[] = [];
    let current: null | GamePlayerNotifications = null;

    for (const playerNotification of playerNotifications) {
        const game = playerNotification.game ?? null;

        if (current === null || current.game?.publicId !== game?.publicId) {
            current = {
                game,
                playerNotifications: [],
            };

            result.push(current);
        }

        current.playerNotifications.push(playerNotification);
    }

    return result;
};
