import Container from 'typedi';
import { getCurrentPlayer, isBotGame } from '../../../../shared/app/hostedGameUtils';
import { PushNotificationFactory } from '../../../../shared/app/PushNotificationFactory';
import { PushNotificationsPool } from '../../../services/PushNotificationsPool';
import { notifier } from '../notifier';

const pushNotificationsPool = Container.get(PushNotificationsPool);

notifier.on('gameStart', hostedGame => {
    if (isBotGame(hostedGame)) {
        return;
    }

    const { host } = hostedGame;
    const pushPayload = PushNotificationFactory.createPlayerJoinedAndGameStartedNotification(host, hostedGame);

    pushNotificationsPool.poolNotification(host, pushPayload);
});

notifier.on('move', (hostedGame, move) => {
    if (isBotGame(hostedGame)) {
        return;
    }

    const player = getCurrentPlayer(hostedGame);

    if (null === player) {
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
