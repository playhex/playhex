import { defineStore, storeToRefs } from 'pinia';
import { PlayerNotification } from '../../shared/app/models/index.js';
import { computed, Ref, ref, watch } from 'vue';
import { apiGetPlayerNotifications } from '../apiClient.js';
import useAuthStore from './authStore.js';
import { GamePlayerNotifications, groupPlayerNotificationByGame } from '../../shared/app/playerNotificationUtils.js';

const usePlayerNotificationsStore = defineStore('playerNotificationsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const playerNotifications: Ref<null | PlayerNotification[]> = ref(null);

    const gamePlayerNotifications = computed<GamePlayerNotifications[] | null>(() => {
        if (playerNotifications.value === null) {
            return null;
        }

        return groupPlayerNotificationByGame(playerNotifications.value);
    });

    const reloadPlayerNotifications = async (): Promise<PlayerNotification[]> => {
        const promise = apiGetPlayerNotifications();

        promise.then(notifications => playerNotifications.value = notifications);

        return promise;
    };

    if (loggedInPlayer.value !== null) {
        reloadPlayerNotifications();
    }

    // Update player notifications when logged in player change
    watch(loggedInPlayer, player => {
        playerNotifications.value = null;

        if (player === null) {
            return;
        }

        reloadPlayerNotifications();
    });

    return {
        playerNotifications,
        gamePlayerNotifications,
    };

});

export default usePlayerNotificationsStore;
