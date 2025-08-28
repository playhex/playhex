import useSocketStore from '../stores/socketStore.js';
import { SEND_ACTIVITY_COOLDOWN } from '../../shared/app/playerActivityConfig.js';
import { areSameOnlinePlayerPage, OnlinePlayerPage } from '../../shared/app/OnlinePlayerPage.js';

let cooldownTimeout: null | NodeJS.Timeout = null;
let hadActivityWhileCooldown = false;

let lastOnlinePlayerPage: OnlinePlayerPage = null;

/**
 * Notify activity to server.
 * Debounced.
 * If player current page changed, notifies server now.
 *
 * To be called when player do something on front side that server cannot guess
 * (route change, mouse move, ...)
 */
export const notifyActivity = (currentPage?: OnlinePlayerPage): void => {
    if (cooldownTimeout !== null && (currentPage === undefined || areSameOnlinePlayerPage(currentPage, lastOnlinePlayerPage))) {
        hadActivityWhileCooldown = true;
        return;
    }

    const { socket } = useSocketStore();

    socket.emit('activity', currentPage);
    resetCooldown();

    if (currentPage !== undefined) {
        lastOnlinePlayerPage = currentPage;
    }

    cooldownTimeout = setTimeout(() => {
        if (hadActivityWhileCooldown) {
            resetCooldown();
            notifyActivity();
        } else {
            resetCooldown();
        }
    }, SEND_ACTIVITY_COOLDOWN);
};

addEventListener('mousemove', () => notifyActivity());
addEventListener('mousedown', () => notifyActivity());
addEventListener('focus', () => notifyActivity());

const resetCooldown = () => {
    if (cooldownTimeout !== null) {
        clearTimeout(cooldownTimeout);
        cooldownTimeout = null;
        hadActivityWhileCooldown = false;
    }
};
