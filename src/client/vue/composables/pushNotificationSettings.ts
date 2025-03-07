import { ref } from 'vue';
import { serviceWorkerRegistrationPromise, subscribeToPushNotifications as baseSubscribeToPushNotifications } from '../../services/registerServiceWorker';

export const usePushNotificationSettings = () => {
    const permission = ref(Notification.permission);

    const subscribed = ref(false);

    const requestPermission = async () => {
        permission.value = await Notification.requestPermission();

        if ('granted' === permission.value) {
            const serviceWorkerRegistration = await serviceWorkerRegistrationPromise;

            if (null !== serviceWorkerRegistration) {
                await subscribeToPushNotifications();
            }
        }
    };

    navigator.permissions.query({ name: 'notifications' }).then(permissionStatus => {
        permissionStatus.addEventListener('change', () => {
            if ('prompt' === permissionStatus.state) {
                permission.value = 'default';
            } else {
                permission.value = permissionStatus.state;
            }
        });
    });

    const subscribeToPushNotifications = async () => {
        const result = await baseSubscribeToPushNotifications();

        if (null !== result) {
            subscribed.value = true;
        }
    };

    return {
        permission,
        requestPermission,
        subscribed,
        subscribeToPushNotifications,
    };
};
