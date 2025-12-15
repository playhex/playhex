import { storeToRefs } from 'pinia';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import { computed } from 'vue';

export const useTutorialControls = () => {
    const { playerSettings } = storeToRefs(usePlayerSettingsStore());

    const shouldDisplayLink = computed<boolean>(() => {
        return playerSettings.value?.showTutorial === true;
    });

    const dismissTutorial = async () => {
        if (!playerSettings.value) {
            throw new Error('Cannot dismiss tutorial, player settings not yet loaded');
        }

        playerSettings.value.showTutorial = false;
        await usePlayerSettingsStore().updatePlayerSettings();
    };

    return {
        shouldDisplayLink,
        dismissTutorial,
    };
};
