import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { subscribeToPushNotifications as baseSubscribeToPushNotifications } from '../services/registerServiceWorker.js';

/**
 * Manage Notifications permission, push subscription
 */
const useNotificationStore = defineStore('notificationStore', () => {

    /**
     * Whether player has granted, denied permission, or has not yet been asked.
     */
    const permission = ref(Notification?.permission ?? 'denied');

    /**
     * Whether push subscription has been successfully sent to server.
     */
    const subscribed = ref(false);

    /**
     * @returns State of permission after prompt. False if notifications not supported by browser.
     */
    const requestPermission = async (): Promise<false | NotificationPermission> => {
        if (typeof Notification === 'undefined') {
            return false;
        }

        permission.value = await Notification.requestPermission();

        return permission.value;
    };

    // Listens notification permission change
    void navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.addEventListener('change', () => {
            if (permissionStatus.state === 'prompt') {
                permission.value = 'default';
            } else {
                permission.value = permissionStatus.state;
            }

            subscribed.value = false;
        });
    });

    /**
     * Send push subscription and update subscribed ref
     */
    const subscribeToPushNotifications = async () => {
        const result = await baseSubscribeToPushNotifications();

        if (result === null) {
            return;
        }

        subscribed.value = true;
    };

    // On load, or when notification granted, subscribe to push
    watch(permission, async (newPermission) => {
        if (newPermission !== 'granted') {
            return;
        }

        await subscribeToPushNotifications();
    }, {
        immediate: true,
    });

    return {
        permission,
        subscribed,
        requestPermission,
    };
});

export default useNotificationStore;
