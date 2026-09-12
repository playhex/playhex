import { getOtherPlayer, getStrictWinnerPlayer } from './gameUtils.js';
import { Game, Player, Tournament } from './models/index.js';
import { pseudoString } from './pseudoUtils.js';
import { PushPayload } from './PushPayload.js';
import { getCheckInOpensDate } from './tournamentUtils.js';

const gameTag = (game: Game): string => `game-${game.publicId}`;
const tournamentTag = (tournament: Tournament): string => `tournament-${tournament.publicId}`;

/**
 * Create push notifications payload for given event
 */
export class PushNotificationFactory
{
    static createPlayerJoinedAndGameStartedNotification(player: Player, game: Game): PushPayload
    {
        const otherPlayer = getOtherPlayer(game, player);

        if (otherPlayer === null) {
            throw new Error('No other player, cannot create push');
        }

        const description = `${pseudoString(otherPlayer)} joined your game`;

        const push = new PushPayload(description);

        push.title = 'Your game has started';
        push.goToPath = `/games/${game.publicId}`;
        push.date = game.startedAt ?? new Date();
        push.tag = gameTag(game);

        return push;
    }

    static createGameCreatedBySystemStartedNotification(player: Player, game: Game): PushPayload
    {
        const otherPlayer = getOtherPlayer(game, player);

        if (otherPlayer === null) {
            throw new Error('No other player, cannot create push');
        }

        const description = `You play against ${pseudoString(otherPlayer)}`;

        const push = new PushPayload(description);

        push.title = 'Your game has started';
        push.goToPath = `/games/${game.publicId}`;
        push.date = game.startedAt ?? new Date();
        push.tag = gameTag(game);

        return push;
    }

    static createTurnToPlayNotification(player: Player, game: Game, movePlayedAt: Date): PushPayload
    {
        const otherPlayer = getOtherPlayer(game, player);

        if (otherPlayer === null) {
            throw new Error('No other player, cannot create push');
        }

        const description = `${pseudoString(otherPlayer)} played a move`;

        const push = new PushPayload(description);

        push.title = 'Your turn';
        push.goToPath = `/games/${game.publicId}`;
        push.date = movePlayedAt;
        push.tag = gameTag(game);

        return push;
    }

    static createGameEndedNotification(player: Player, game: Game): PushPayload
    {
        const otherPlayer = getOtherPlayer(game, player);
        const winner = getStrictWinnerPlayer(game);

        if (otherPlayer === null) {
            throw new Error('No other player, cannot create push');
        }

        const description = `You ${winner.publicId === otherPlayer.publicId ? 'lost' : 'won'} against ${pseudoString(otherPlayer)}`;

        const push = new PushPayload(description);

        push.title = 'Your game has ended';
        push.goToPath = `/games/${game.publicId}`;
        push.date = game.endedAt ?? new Date();
        push.tag = gameTag(game);

        return push;
    }

    static createTournamentCheckInOpen(tournament: Tournament): PushPayload
    {
        const push = new PushPayload('You must check-in now to participate!');

        push.title = `${tournament.title} tournament starts soon`;
        push.goToPath = `/tournaments/${tournament.slug}`;
        push.date = getCheckInOpensDate(tournament);
        push.tag = tournamentTag(tournament);

        return push;
    }
}
