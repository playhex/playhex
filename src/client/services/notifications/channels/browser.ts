import i18next from 'i18next';
import { getOpponent, hasFocus, iAmInGame, isMe, viewingGame } from '../context-utils';
import { notifier } from '../notifier';
import { pseudoString } from '@shared/app/pseudoUtils';
import router from '../../../vue/router';
import { isBotGame } from '../../../../shared/app/hostedGameUtils';
import { serviceWorkerRegistrationPromise } from '../../registerServiceWorker';
import { RouteLocationAsRelativeTyped } from 'vue-router';

const icon = '/images/logo-transparent.svg';

const tags = {
    default: 'hex default notifications',
    game: 'game notifications',
};

/**
 * If user input is used as body, it should be sanitized,
 * i.e <b> and <i> must be escaped.
 */
const sanitizeNotificationBody = (body: string): string => {
    const text = document.createTextNode(body);
    const p = document.createElement('p');
    p.appendChild(text);
    return p.innerHTML;
};

const sendNotification = async (options: NotificationOptions, route: RouteLocationAsRelativeTyped, title = 'PlayHex') => {
    if ('undefined' === typeof Notification) {
        return;
    }

    if ('granted' !== Notification.permission) {
        return;
    }

    const serviceWorkerRegistration = await serviceWorkerRegistrationPromise;

    if (null === serviceWorkerRegistration) {
        return;
    }

    const computedOptions: NotificationOptions = {
        tag: tags.default,
        ...options,
        icon,
        data: {
            goToPath: router.resolve(route).fullPath,
        },
    };

    await serviceWorkerRegistration.showNotification(title, computedOptions);
};

notifier.on('gameStart', (hostedGame) => {
    if (isBotGame(hostedGame)) {
        return;
    }

    if (viewingGame(hostedGame) && hasFocus()) {
        return;
    }

    // Only notify game host. Player who just joined don't need to be notified, neither are watchers.
    if (!isMe(hostedGame.host)) {
        return;
    }

    const opponent = getOpponent(hostedGame);

    if (null === opponent) {
        return;
    }

    sendNotification(
        {
            body: i18next.t('game_with_player_has_started', { player: pseudoString(opponent, 'pseudo') }),
            tag: tags.game,
        },
        {
            name: 'online-game',
            params: { gameId: hostedGame.publicId },
        },
    );
});

notifier.on('chatMessage', (hostedGame, chatMessage) => {
    if (null === chatMessage.player) {
        return;
    }

    if (isMe(chatMessage.player)) {
        return;
    }

    if (!iAmInGame(hostedGame)) {
        return;
    }

    if (viewingGame(hostedGame) && hasFocus()) {
        return;
    }

    sendNotification(
        {
            body: sanitizeNotificationBody(chatMessage.content),
            tag: tags.game,
        },
        {
            name: 'online-game',
            params: { gameId: hostedGame.publicId },
        },
        chatMessage.player ? pseudoString(chatMessage.player) : 'PlayHex',
    );
});
