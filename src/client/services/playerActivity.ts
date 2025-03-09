import useSocketStore from '../stores/socketStore';

/**
 * Won't notify activity to server more than once every N milliseconds.
 */
const SEND_ACTIVITY_COOLDOWN = 30000;

let cooldownTimeout: null | NodeJS.Timeout = null;
let hadActivityWhileCooldown = false;

/**
 * Notify activity to server.
 * Debounced.
 *
 * To be called when player do something on front side that server cannot guess
 * (route change, mouse move, ...)
 */
export const notifyActivity = (): void => {
    if (null !== cooldownTimeout) {
        hadActivityWhileCooldown = true;
        return;
    }

    useSocketStore().socket.emit('activity');

    cooldownTimeout = setTimeout(() => {
        cooldownTimeout = null;

        if (hadActivityWhileCooldown) {
            notifyActivity();
            hadActivityWhileCooldown = false;
        }
    }, SEND_ACTIVITY_COOLDOWN);
};

addEventListener('mousemove', () => notifyActivity());
addEventListener('mousedown', () => notifyActivity());
