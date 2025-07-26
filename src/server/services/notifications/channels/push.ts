import { Container } from 'typedi';
import { getCurrentPlayer, isBotGame } from '../../../../shared/app/hostedGameUtils.js';
import { PushNotificationFactory } from '../../../../shared/app/PushNotificationFactory.js';
import { PushNotificationsPool } from '../../../services/PushNotificationsPool.js';
import { notifier } from '../notifier.js';

const pushNotificationsPool = Container.get(PushNotificationsPool);

notifier.on('gameStart', hostedGame => {
    if (isBotGame(hostedGame)) {
        return;
    }

    const { host } = hostedGame;

    // Game created by system, push both players
    if (host === null) {
        for (const hostedGameToPlayer of hostedGame.hostedGameToPlayers) {
            const pushPayload = PushNotificationFactory.createGameCreatedBySystemStartedNotification(hostedGameToPlayer.player, hostedGame);
            pushNotificationsPool.poolNotification(hostedGameToPlayer.player, pushPayload);
        }

        return;
    }

    // Game created by someone, only push player who joined the game
    const pushPayload = PushNotificationFactory.createPlayerJoinedAndGameStartedNotification(host, hostedGame);
    pushNotificationsPool.poolNotification(host, pushPayload);
});

notifier.on('move', (hostedGame, move) => {
    if (isBotGame(hostedGame)) {
        return;
    }

    const player = getCurrentPlayer(hostedGame);

    if (player === null) {
        return;
    }

    const pushPayload = PushNotificationFactory.createTurnToPlayNotification(player, hostedGame, move.playedAt);

    pushNotificationsPool.poolNotification(player, pushPayload);
});

notifier.on('gameEnd', hostedGame => {
    if (isBotGame(hostedGame)) {
        return;
    }

    hostedGame.hostedGameToPlayers.forEach(hostedGameToPlayer => {
        const { player } = hostedGameToPlayer;
        const pushPayload = PushNotificationFactory.createGameEndedNotification(player, hostedGame);

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
