import { defineOverlay } from '@overlastic/vue';
import { storeToRefs } from 'pinia';
import useNotificationStore from '../../stores/notificationStore.js';
import EnableNotificationsOverlay, { type NotificationType } from '../components/overlay/EnableNotificationsOverlay.vue';

export const useEnableNotificationsAfterTournamentSubscribe = (featuredNotification?: NotificationType) => {
    const { permission } = storeToRefs(useNotificationStore());
    const openOverlay = defineOverlay(EnableNotificationsOverlay);

    const promptIfNeeded = async () => {
        if (permission.value !== 'default') return;
        try { await openOverlay({ featuredNotification }); } catch { /* dismissed */ }
    };

    return { promptIfNeeded };
};
