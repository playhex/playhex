import { getOtherPlayer, getStrictWinnerPlayer } from './hostedGameUtils.js';
import { HostedGame, Player } from './models/index.js';
import { pseudoString } from './pseudoUtils.js';
import { PushPayload } from './PushPayload.js';

const gameTag = (hostedGame: HostedGame): string => `game-${hostedGame.publicId}`;

/**
 * Create push notifications payload for given event
 */
export class PushNotificationFactory
{
    static createPlayerJoinedAndGameStartedNotification(player: Player, hostedGame: HostedGame): PushPayload
    {
        const otherPlayer = getOtherPlayer(hostedGame, player);

        if (null === otherPlayer) {
            throw new Error('No other player, cannot create push');
        }

        const description = `${pseudoString(otherPlayer)} joined your game`;

        const push = new PushPayload(description);

        push.title = 'Your game has started';
        push.goToPath = `/games/${hostedGame.publicId}`;
        push.date = hostedGame.gameData?.startedAt ?? new Date();
        push.tag = gameTag(hostedGame);

        return push;
    }

    static createTurnToPlayNotification(player: Player, hostedGame: HostedGame, movePlayedAt: Date): PushPayload
    {
        const otherPlayer = getOtherPlayer(hostedGame, player);

        if (null === otherPlayer) {
            throw new Error('No other player, cannot create push');
        }

        const description = `${pseudoString(otherPlayer)} played a move`;

        const push = new PushPayload(description);

        push.title = 'Your turn';
        push.goToPath = `/games/${hostedGame.publicId}`;
        push.date = movePlayedAt;
        push.tag = gameTag(hostedGame);

        return push;
    }

    static createGameEndedNotification(player: Player, hostedGame: HostedGame): PushPayload
    {
        const otherPlayer = getOtherPlayer(hostedGame, player);
        const winner = getStrictWinnerPlayer(hostedGame);

        if (null === otherPlayer) {
            throw new Error('No other player, cannot create push');
        }

        const description = `You ${winner.publicId === otherPlayer.publicId ? 'lost' : 'won'} against ${pseudoString(otherPlayer)}`;

        const push = new PushPayload(description);

        push.title = 'Your game has ended';
        push.goToPath = `/games/${hostedGame.publicId}`;
        push.date = hostedGame.gameData?.endedAt ?? new Date();
        push.tag = gameTag(hostedGame);

        return push;
    }
}
