import { defineStore, storeToRefs } from 'pinia';
import { PlayerSettings } from '../../shared/app/models';
import { Ref, ref, watch } from 'vue';
import { apiGetPlayerSettings, apiPatchPlayerSettings } from '../apiClient';
import useAuthStore from './authStore';

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

        promise.then(settings => playerSettings.value = settings);

        return promise;
    };

    if (null !== loggedInPlayer.value) {
        reloadPlayerSettings();
    }

    // Update player settings when logged in player change
    watch(loggedInPlayer, player => {
        playerSettings.value = null;

        if (null === player) {
            return;
        }

        reloadPlayerSettings();
    });

    const updatePlayerSettings = async (): Promise<void> => {
        if (null === playerSettings.value) {
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
