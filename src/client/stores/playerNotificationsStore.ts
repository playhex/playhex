import { defineStore, storeToRefs } from 'pinia';
import { PlayerNotification } from '../../shared/app/models/index.js';
import { computed, Ref, ref, watch } from 'vue';
import { apiGetPlayerNotifications } from '../apiClient.js';
import useAuthStore from './authStore.js';
import { GamePlayerNotifications, groupPlayerNotificationByGame } from '../../shared/app/playerNotificationUtils.js';
import useSocketStore from './socketStore.js';

/**
 * Stores player notifications: the ones in the header.
 */
const usePlayerNotificationsStore = defineStore('playerNotificationsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const { socket } = useSocketStore();

    const playerNotifications: Ref<null | PlayerNotification[]> = ref(null);

    const gamePlayerNotifications = computed<GamePlayerNotifications[] | null>(() => {
        if (playerNotifications.value === null) {
            return null;
        }

        return groupPlayerNotificationByGame(playerNotifications.value);
    });

    const reloadPlayerNotifications = async (): Promise<PlayerNotification[]> => {
        const promise = apiGetPlayerNotifications();

        void promise.then(notifications => playerNotifications.value = notifications);

        return await promise;
    };

    if (loggedInPlayer.value !== null) {
        void reloadPlayerNotifications();
    }

    // Update player notifications when logged in player change
    watch(loggedInPlayer, player => {
        playerNotifications.value = null;

        if (player === null) {
            return;
        }

        void reloadPlayerNotifications();
    });

    socket.on('playerNotification', playerNotification => {
        if (playerNotifications.value === null) {
            return;
        }

        playerNotifications.value.push(playerNotification);
    });

    return {
        playerNotifications,
        gamePlayerNotifications,
    };

});

export default usePlayerNotificationsStore;
