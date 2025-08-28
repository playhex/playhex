import { HostedGame } from './models/index.js';
import PlayerNotification from './models/PlayerNotification.js';

export type GamePlayerNotifications = {
    /**
     * From which game notifications are from.
     * Null if it does not come from a game.
     */
    hostedGame: null | HostedGame;

    playerNotifications: PlayerNotification[];
};

/**
 * Groups player notification by hosted game.
 */
export const groupPlayerNotificationByGame = (playerNotifications: PlayerNotification[]): GamePlayerNotifications[] => {
    const indexed: { [hostedGamePublicId: string]: PlayerNotification[] } = {};

    for (const playerNotification of playerNotifications) {
        const index = playerNotification.hostedGame?.publicId ?? 'null';

        if (!indexed[index]) {
            indexed[index] = [];
        }

        indexed[index].push(playerNotification);
    }

    const result: GamePlayerNotifications[] = [];

    for (const publicId in indexed) {
        result.push({
            hostedGame: indexed[publicId][0].hostedGame ?? null,
            playerNotifications: indexed[publicId],
        });
    }

    return result;
};
