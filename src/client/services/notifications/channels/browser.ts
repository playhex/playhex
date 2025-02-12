import i18next from 'i18next';
import { getOpponent, hasFocus, iAmInGame, isMe, viewingGame } from '../context-utils';
import { notifier } from '../notifier';
import { pseudoString } from '@shared/app/pseudoUtils';
import router from '../../../vue/router';

const icon = '/images/logo-transparent.svg';

const tags = { game: 'game notifications' };

export const requestNotificationPermission = (): void => {
    if ('undefined' === typeof Notification) {
        return;
    }

    if (Notification.permission === 'default') Notification.requestPermission();
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

const sendNotification = (options: NotificationOptions, route: () => void, title = 'PlayHex') => {
    if ('undefined' === typeof Notification) {
        return;
    }

    if (Notification.permission === 'default') {
        Notification.requestPermission();
    } else if (Notification.permission === 'granted') {
        try {
            new Notification(title, { ...options, icon }).onclick = function() {
                if (route) route();
                focus();
                this.close();
            };
        } catch (e) {
            // TODO check compatibility on mobile. https://stackoverflow.com/questions/29774836/failed-to-construct-notification-illegal-constructor
        }
    }
};

notifier.on('gameStart', (hostedGame) => {
    if (hasFocus()) {
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
        () => {
            router.push({
                name: 'online-game',
                params: { gameId: hostedGame.publicId },
            });
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
        () => {
            router.push({
                name: 'online-game',
                params: { gameId: hostedGame.publicId },
            });
        },
        chatMessage.player ? pseudoString(chatMessage.player) : 'PlayHex',
    );
});
