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

    const requestPermission = async () => {
        if ('undefined' === typeof Notification) {
            return;
        }

        permission.value = await Notification.requestPermission();
    };

    // Listens notification permission change
    navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.addEventListener('change', () => {
            if ('prompt' === permissionStatus.state) {
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

        if (null === result) {
            return;
        }

        subscribed.value = true;
    };

    // On load, or when notification granted, subscribe to push
    watch(permission, async (newPermission) => {
        if ('granted' !== newPermission) {
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
