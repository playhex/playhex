import { Container } from 'typedi';
import { getCurrentPlayer, isBotGame } from '../../../../shared/app/gameUtils.js';
import { PushNotificationFactory } from '../../../../shared/app/PushNotificationFactory.js';
import { PushNotificationsPool } from '../../../services/PushNotificationsPool.js';
import { notifier } from '../notifier.js';

const pushNotificationsPool = Container.get(PushNotificationsPool);

notifier.on('gameStart', game => {
    if (isBotGame(game)) {
        return;
    }

    const { host } = game;

    // Game created by system, push both players
    if (host === null) {
        for (const gameToPlayer of game.gameToPlayers) {
            const pushPayload = PushNotificationFactory.createGameCreatedBySystemStartedNotification(gameToPlayer.player, game);
            pushNotificationsPool.poolNotification(gameToPlayer.player, pushPayload);
        }

        return;
    }

    // Game created by someone, only push player who joined the game
    const pushPayload = PushNotificationFactory.createPlayerJoinedAndGameStartedNotification(host, game);
    pushNotificationsPool.poolNotification(host, pushPayload);
});

notifier.on('move', (game, timestampedMove) => {
    if (isBotGame(game)) {
        return;
    }

    const player = getCurrentPlayer(game);

    if (player === null) {
        return;
    }

    const pushPayload = PushNotificationFactory.createTurnToPlayNotification(player, game, timestampedMove.playedAt);

    pushNotificationsPool.poolNotification(player, pushPayload);
});

notifier.on('gameEnd', game => {
    if (isBotGame(game)) {
        return;
    }

    game.gameToPlayers.forEach(gameToPlayer => {
        const { player } = gameToPlayer;
        const pushPayload = PushNotificationFactory.createGameEndedNotification(player, game);

        pushNotificationsPool.poolNotification(player, pushPayload);
    });
});

notifier.on('tournamentCheckInOpen', tournament => {
    for (const subscription of tournament.subscriptions) {
        const pushPayload = PushNotificationFactory.createTournamentCheckInOpen(tournament);

        if (subscription.checkedIn) {
            continue;
        }

        pushNotificationsPool.poolNotification(subscription.player, pushPayload);
    }
});
