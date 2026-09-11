import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { usePermission } from '@vueuse/core';
import { subscribeToPushNotifications as baseSubscribeToPushNotifications } from '../services/registerServiceWorker.js';
import { getNotificationPermission, isNotificationSupported, requestNotificationPermission } from '../services/browserNotification.js';

/**
 * Manage Notifications permission, push subscription
 */
const useNotificationStore = defineStore('notificationStore', () => {

    /**
     * Whether player has granted, denied permission, or has not yet been asked.
     */
    const permission = ref<NotificationPermission>(getNotificationPermission());

    /**
     * Whether push subscription has been successfully sent to server.
     */
    const subscribed = ref(false);

    /**
     * @returns State of permission after prompt. False if notifications not supported by browser.
     */
    const requestPermission = async (): Promise<false | NotificationPermission> => {
        const result = await requestNotificationPermission();

        if (result === false) {
            return false;
        }

        permission.value = result;

        return permission.value;
    };

    /*
     * Listens notification permission change.
     * usePermission() handles browsers without Permissions API, or not knowing
     * the 'notifications' descriptor (iOS Safari): it then just stays on 'prompt' and never changes.
     * Its state is only used as a change signal, Notification.permission stays the source of truth.
     */
    const notificationsPermissionState = usePermission('notifications');

    watch(notificationsPermissionState, () => {
        permission.value = getNotificationPermission();
        subscribed.value = false;
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
        isNotificationSupported,
        permission,
        subscribed,
        requestPermission,
    };
});

export default useNotificationStore;
