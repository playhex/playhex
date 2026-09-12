import { Container } from 'typedi';
import { notifier } from '../notifier.js';
import { truncateText } from '../../../../shared/app/utils.js';
import { pseudoString } from '../../../../shared/app/pseudoUtils.js';
import { createPlayerNotification } from '../../../../shared/app/models/PlayerNotification.js';
import { getLoserPlayer, getOtherPlayer, getPlayers, getWinnerPlayer } from '../../../../shared/app/gameUtils.js';
import logger from '../../../services/logger.js';
import OnlinePlayersService from '../../../services/OnlinePlayersService.js';
import { PlayerNotificationsService } from '../../../services/PlayerNotificationsService.js';
import GameRepository from '../../../repositories/GameRepository.js';

const onlinePlayerService = Container.get(OnlinePlayersService);
const playerNotificationService = Container.get(PlayerNotificationsService);
const gamePersister = Container.get(GameRepository);

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
notifier.on('chatMessage', async (game, chatMessage) => {

    // No notification for system messages
    if (chatMessage.player === null) {
        return;
    }

    // No notification for shadow deleted or moderated chat messages
    if (chatMessage.shadowDeleted || chatMessage.deletedByModeration) {
        return;
    }

    for (const { player } of game.gameToPlayers) {

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
            const isGameActive = game.state === 'playing' || game.state === 'created';
            const playerIsWatching = onlinePlayerService.isOnGamePage(player, game.publicId);

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
            game,
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
notifier.on('gameEnd', async game => {
    // No notification for bot game ended
    if (game.opponentType === 'ai') {
        return;
    }

    const winner = getWinnerPlayer(game);
    const loser = getLoserPlayer(game);

    if (!winner || !loser) {
        logger.warning('Cannot add notification for gameEnded, no winner or loser', {
            gamePublicId: game.publicId,
        });

        return;
    }

    for (const { player } of game.gameToPlayers) {
        // Do not notify player if active
        if (onlinePlayerService.isActive(player)) {
            continue;
        }

        const opponent = getOtherPlayer(game, player);

        const playerNotification = createPlayerNotification(
            'gameEnded',
            {
                iWon: winner.publicId === player.publicId,
                opponent: opponent ? pseudoString(opponent) : '?',
            },
            player,
            game,
            game.endedAt ?? new Date(),
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
notifier.on('gameCanceled', async game => {
    // No notification for bot game canceled
    if (game.opponentType === 'ai') {
        return;
    }

    for (const { player } of game.gameToPlayers) {
        // Do not notify player if active
        if (onlinePlayerService.isActive(player)) {
            continue;
        }

        const playerNotification = createPlayerNotification(
            'gameCanceled',
            null,
            player,
            game,
            game.endedAt ?? new Date(),
        );

        await playerNotificationService.addNotification(playerNotification);
    }
});

/**
 * Tells player that they have been nominatively challenged by another player.
 *
 * Should send only when player is offline or inactive,
 * as active players are already notified in real time (toast + sound).
 */
notifier.on('gameChallengeCreated', async (game, opponent) => {
    if (onlinePlayerService.isActive(opponent)) {
        return;
    }

    if (game.host === null) {
        return;
    }

    const playerNotification = createPlayerNotification(
        'gameChallenge',
        {
            player: pseudoString(game.host),
        },
        opponent,
        game,
        game.createdAt,
    );

    await playerNotificationService.addNotification(playerNotification);
});

notifier.on('moderationActionTaken', async action => {
    if (action.relatedChatMessages.length === 0) {
        return;
    }

    const game = await gamePersister.findGameFromChatMessage(action.relatedChatMessages[0].publicId);

    if (!game) {
        return;
    }

    for (const participant of getPlayers(game)) {
        if (participant.publicId === action.player.publicId) {
            continue;
        }

        if (participant.isBot) {
            continue;
        }

        const playerNotification = createPlayerNotification(
            'myOpponentHasBeenModerated',
            {
                player: pseudoString(action.player),
                game: undefined,
            },
            participant,
            game,
            action.createdAt,
        );

        await playerNotificationService.addNotification(playerNotification);
    }

});
