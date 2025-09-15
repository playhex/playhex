import { defineStore, storeToRefs } from 'pinia';
import { PlayerSettings } from '../../shared/app/models/index.js';
import { Ref, ref, watch } from 'vue';
import { apiGetPlayerSettings, apiPatchPlayerSettings } from '../apiClient.js';
import useAuthStore from './authStore.js';

/**
 * Player settings stored in database, so shared accross his devices
 *
 * Contains player settings when needed
 * for every games (ask move confirm or not...)
 * Can update settings.
 */
const usePlayerSettingsStore = defineStore('playerSettingsStore', () => {

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const playerSettings: Ref<null | PlayerSettings> = ref(null);

    const reloadPlayerSettings = async (): Promise<PlayerSettings> => {
        const promise = apiGetPlayerSettings();

        void promise.then(settings => playerSettings.value = settings);

        return await promise;
    };

    if (loggedInPlayer.value !== null) {
        void reloadPlayerSettings();
    }

    // Update player settings when logged in player change
    watch(loggedInPlayer, player => {
        playerSettings.value = null;

        if (player === null) {
            return;
        }

        void reloadPlayerSettings();
    });

    const updatePlayerSettings = async (): Promise<void> => {
        if (playerSettings.value === null) {
            throw new Error('Cannot update player settings, no value');
        }

        await apiPatchPlayerSettings(playerSettings.value);
    };

    return {
        playerSettings,
        updatePlayerSettings,
    };

});

export default usePlayerSettingsStore;
