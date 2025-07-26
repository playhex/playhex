import router from '../vue/router.js';
import { apiPutPushSubscription } from '../apiClient.js';

/* global PUSH_VAPID_PUBLIC_KEY */
// @ts-ignore: PUSH_VAPID_PUBLIC_KEY replaced at build time by webpack.
const pushValidPublicKey: undefined | string = PUSH_VAPID_PUBLIC_KEY;

/**
 * Register service worker, and returns a ServiceWorkerRegistration,
 * used later to show notifications, subscribe to push notifications...
 *
 * Should be called at client app load.
 */
const registerServiceWorker = async (): Promise<null | ServiceWorkerRegistration> => {
    if (!('serviceWorker' in navigator)) {
        // eslint-disable-next-line no-console
        console.warn('serviceWorker is not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');

        return registration;
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error while worker registering', e);
    }

    return null;
};

/**
 * Every time url change, send it to service worker
 * to let him know which route is currently displayed
 */
const syncServiceWorkerClientUrl = async () => {
    const registration = await serviceWorkerRegistrationPromise;

    if (registration === null) {
        return;
    }

    router.afterEach(to => {
        registration.active?.postMessage({
            type: 'ROUTE_UPDATE',
            url: to.fullPath,
        });
    });
};

/**
 * Listen to messages received from service worker.
 */
const listenServiceWorkerMessages = () => {
    if (!('serviceWorker' in navigator)) {
        // eslint-disable-next-line no-console
        console.warn('serviceWorker is not supported');
        return;
    }

    try {
        navigator.serviceWorker.addEventListener('message', (event) => {
            // Listen to service worker message NAVIGATE to go to route when he wants
            if (event.data?.type === 'NAVIGATE') {
                const { goToPath } = event.data;

                if (router.currentRoute.value.fullPath !== goToPath) {
                    router.push(goToPath);
                }
            }
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error while trying to listen service worker messages', e);
    }
};

export const getSubscription = async (): Promise<PushSubscription | null> => {
    const registration = await serviceWorkerRegistrationPromise;

    if (!registration?.pushManager) {
        return null;
    }

    return await registration.pushManager.getSubscription();
};

/**
 * Get a registration (endpoint, keys) from current vendor push service,
 * and post it to server so that server can send me push notifications.
 */
export const subscribeToPushNotifications = async (): Promise<null | PushSubscription> => {
    if (typeof Notification === 'undefined') {
        return null;
    }

    if (Notification.permission !== 'granted') {
        return null;
    }

    let pushSubscription = await getSubscription();

    if (pushSubscription === null) {
        const registration = await serviceWorkerRegistrationPromise;

        if (!registration?.pushManager || typeof pushValidPublicKey !== 'string' || pushValidPublicKey.length === 0) {
            return null;
        }

        pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: pushValidPublicKey,
        });
    }

    await apiPutPushSubscription(pushSubscription);

    return pushSubscription;
};

export const serviceWorkerRegistrationPromise = registerServiceWorker();

subscribeToPushNotifications();
syncServiceWorkerClientUrl();
listenServiceWorkerMessages();
