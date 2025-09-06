import { Container } from 'typedi';
import { notifier } from '../notifier.js';
import { truncateText } from '../../../../shared/app/utils.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { createPlayerNotification } from '../../../../shared/app/models/PlayerNotification.js';
import { getLoserPlayer, getOtherPlayer, getWinnerPlayer } from '../../../../shared/app/hostedGameUtils.js';
import logger from '../../../services/logger.js';
import OnlinePlayersService from '../../../services/OnlinePlayersService.js';
import { PlayerNotificationsService } from '../../../services/PlayerNotificationsService.js';

const onlinePlayerService = Container.get(OnlinePlayersService);
const playerNotificationService = Container.get(PlayerNotificationsService);

/*
 * Adds notifications in the player header, in the UI.
 *
 * Should only add notification when player is not on the game page,
 * even when online.
 */

/**
 * Tells player that he received a chat message on one of his game.
 * Use case: not miss a message that my opponent posted on a game that ended days ago.
 *
 * Should send when player is:
 * - offline or inactive => always
 * - active => in ended games only, if not already on this game page
 */
notifier.on('chatMessage', async (hostedGame, chatMessage) => {

    // No notification for system messages
    if (chatMessage.player === null) {
        return;
    }

    // No notification for shadow deleted chat messages
    if (chatMessage.shadowDeleted) {
        return;
    }

    for (const { player } of hostedGame.hostedGameToPlayers) {

        // Do not notify chat message sender
        if (player.publicId === chatMessage.player.publicId) {
            continue;
        }

        // Do not add notifications for bots
        if (player.isBot) {
            continue;
        }

        // Do not add notification if player is active, and game is active or player is on the page already
        if (onlinePlayerService.isActive(player)) {
            const isGameActive = hostedGame.state === 'playing' || hostedGame.state === 'created';
            const playerIsWatching = onlinePlayerService.isOnGamePage(player, hostedGame.publicId);

            if (isGameActive || playerIsWatching) {
                continue;
            }
        }

        const playerNotification = createPlayerNotification(
            'chatMessage',
            {
                player: pseudoString(chatMessage.player),
                text: truncateText(chatMessage.content),
            },
            player,
            hostedGame,
            chatMessage.createdAt,
        );

        await playerNotificationService.addNotification(playerNotification);
    }
});

/**
 * Tells player that one of their game has ended.
 * Use case: know that my opponent resigned in correpondence game while I was offline.
 *
 * Should send only when player is offline.
 * May notify both players, e.g in case of a player timeout while offline.
 */
notifier.on('gameEnd', async hostedGame => {
    // No notification for bot game ended
    if (hostedGame.opponentType === 'ai') {
        return;
    }

    const winner = getWinnerPlayer(hostedGame);
    const loser = getLoserPlayer(hostedGame);

    if (!winner || !loser) {
        logger.warning('Cannot add notification for gameEnded, no winner or loser', {
            hostedGamePublicId: hostedGame.publicId,
        });

        return;
    }

    for (const { player } of hostedGame.hostedGameToPlayers) {
        // Do not notify player if active
        if (onlinePlayerService.isActive(player)) {
            continue;
        }

        const opponent = getOtherPlayer(hostedGame, player);

        const playerNotification = createPlayerNotification(
            'gameEnded',
            {
                iWon: winner.publicId === player.publicId,
                opponent: opponent ? pseudoString(opponent) : '?',
            },
            player,
            hostedGame,
            hostedGame.gameData?.endedAt ?? new Date(),
        );

        await playerNotificationService.addNotification(playerNotification);
    }
});

/**
 * Tells player that one of their game has been canceled.
 * Use case: know that my opponent canceled the game.
 *
 * Should send only when player is offline.
 */
notifier.on('gameCanceled', async hostedGame => {
    // No notification for bot game canceled
    if (hostedGame.opponentType === 'ai') {
        return;
    }

    for (const { player } of hostedGame.hostedGameToPlayers) {
        // Do not notify player if active
        if (onlinePlayerService.isActive(player)) {
            continue;
        }

        const playerNotification = createPlayerNotification(
            'gameCanceled',
            null,
            player,
            hostedGame,
            hostedGame.gameData?.endedAt ?? new Date(),
        );

        await playerNotificationService.addNotification(playerNotification);
    }
});
