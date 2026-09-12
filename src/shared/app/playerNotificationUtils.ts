import { Game } from './models/index.js';
import PlayerNotification from './models/PlayerNotification.js';

export type GamePlayerNotifications = {
    /**
     * From which game notifications are from.
     * Null if it does not come from a game.
     */
    game: null | Game;

    playerNotifications: PlayerNotification[];
};

/**
 * Groups player notification by game.
 */
export const groupPlayerNotificationByGame = (playerNotifications: PlayerNotification[]): GamePlayerNotifications[] => {
    const indexed: { [gamePublicId: string]: PlayerNotification[] } = {};

    for (const playerNotification of playerNotifications) {
        const index = playerNotification.game?.publicId ?? 'null';

        if (!indexed[index]) {
            indexed[index] = [];
        }

        indexed[index].push(playerNotification);
    }

    const result: GamePlayerNotifications[] = [];

    for (const publicId in indexed) {
        result.push({
            game: indexed[publicId][0].game ?? null,
            playerNotifications: indexed[publicId],
        });
    }

    return result;
};
