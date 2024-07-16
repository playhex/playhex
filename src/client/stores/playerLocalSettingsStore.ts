import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { Expose, instanceToPlain, plainToInstance } from '../../shared/app/class-transformer-custom';

const LOCAL_SETTINGS_KEY = 'hex-local-settings';

class LocalSettings
{
    /**
     * Selected board orientation.
     *
     * 'auto' by default, which means board uses player's preferred orientation,
     * depending of screen ratio, and rotate with screen,
     *
     * or player can force to use his preferred landscape or portrait orientation
     * no matter current screen orientation.
     */
    @Expose()
    selectedBoardOrientation: 'auto' | 'landscape' | 'portrait' = 'auto';
}

const loadLocalSettings = (): LocalSettings => {
    const serialized = localStorage?.getItem(LOCAL_SETTINGS_KEY);

    if (!serialized) {
        return new LocalSettings();
    }

    return plainToInstance(LocalSettings, JSON.parse(serialized));
};

const saveLocalSettings = (localSettings: LocalSettings): void => {
    const serialized = JSON.stringify(instanceToPlain(localSettings));

    localStorage?.setItem(LOCAL_SETTINGS_KEY, serialized);
};

/**
 * Player settings stored locally, so only used for this current device
 */
const usePlayerLocalSettingsStore = defineStore('playerLocalSettingsStore', () => {

    /**
     * Player settings stored locally, so only used for this current device
     */
    const localSettings = ref(loadLocalSettings());

    watch(localSettings.value, () => saveLocalSettings(localSettings.value));

    return {
        localSettings,
    };

});

export default usePlayerLocalSettingsStore;
