import { defineStore } from 'pinia';
import { ref, watch, watchEffect } from 'vue';
import { Expose, instanceToPlain, plainToInstance } from '../../shared/app/class-transformer-custom.js';
import { OrientationMode } from '@playhex/pixi-board';
import { apiGetPlayerSettings } from '../apiClient.js';

const LOCAL_SETTINGS_KEY = 'hex-local-settings';

export type DarkOrLight = 'dark' | 'light';
export type SelectedTheme = DarkOrLight | 'auto';

export enum MoveSettings {
    /**
     * Send immediately, and premove allowed
     */
    PREMOVE = 0,

    /**
     * Send immediately (no premove)
     */
    SEND_IMMEDIATELY = 1,

    /**
     * Must confirm moves before send
     */
    MUST_CONFIRM = 2,
}

export class LocalSettings
{
    /**
     * Dark or light theme.
     * "auto" for system theme.
     */
    @Expose()
    selectedTheme: SelectedTheme = 'auto';

    /**
     * Forced board orientation.
     *
     * null by default, which means board uses player's preferred orientation,
     * depending of screen ratio, and rotate with screen,
     *
     * or player can force to use his preferred landscape or portrait orientation
     * no matter current screen orientation.
     */
    @Expose()
    forcedBoardOrientation: null | OrientationMode = null;

    /**
     * Whether to open sidebar on game page open.
     *
     * undefined means it will automatically open on large screens only.
     * true or false to let it open or closed.
     */
    @Expose()
    openSidebar?: boolean;

    /**
     * Mute the gameplay audio.
     *
     * undefined defaults to false (audio on).
     */
    @Expose()
    muteAudio?: boolean;

    // Move settings are local because we don't want to constantly switch between confirm/immediately when switch from mobile and desktop with same account.

    /**
     * Move settings for blitz.
     */
    @Expose()
    moveSettingsBlitz: MoveSettings = MoveSettings.SEND_IMMEDIATELY;

    /**
     * Move settings for live games.
     */
    @Expose()
    moveSettingsNormal: MoveSettings = MoveSettings.SEND_IMMEDIATELY;

    /**
     * Move settings for correspondence games.
     */
    @Expose()
    moveSettingsCorrespondence: MoveSettings = MoveSettings.MUST_CONFIRM;
}

// TODO remove later
const importMoveSettings = (localSettings: LocalSettings) => {
    apiGetPlayerSettings().then(settings => {
        localSettings.moveSettingsBlitz = settings.moveSettingsBlitz;
        localSettings.moveSettingsNormal = settings.moveSettingsNormal;
        localSettings.moveSettingsCorrespondence = settings.moveSettingsCorrespondence;
        saveLocalSettings(localSettings);
    }).catch(() => {});
};

const loadLocalSettings = (): LocalSettings => {
    const serialized = localStorage?.getItem(LOCAL_SETTINGS_KEY);

    if (!serialized) {
        const localSettings = new LocalSettings();

        importMoveSettings(localSettings);

        return localSettings;
    }

    const parsed = JSON.parse(serialized);
    const localSettings = plainToInstance(LocalSettings, parsed);

    if (typeof parsed.moveSettingsBlitz === 'undefined') {
        importMoveSettings(localSettings);
    }

    return localSettings;
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

    // When open game page on small screen, make openSidebar auto to hide it.
    // Or on larger screen, also make auto so it stays open, but will close when reducing screen.
    if (window.screen.width < 576 || localSettings.value.openSidebar) {
        localSettings.value.openSidebar = undefined;
    }

    /*
     * Dark/light theme
     */
    const displayedTheme = (): DarkOrLight => {
        if (localSettings.value.selectedTheme !== 'auto') {
            return localSettings.value.selectedTheme;
        }

        return getSystemPreferredTheme();
    };

    const getSystemPreferredTheme = (): DarkOrLight => window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
    ;

    const switchTheme = (): void => {
        localSettings.value.selectedTheme = displayedTheme() === 'light'
            ? 'dark'
            : 'light'
        ;
    };

    watchEffect(() => {
        localStorage?.setItem('selectedTheme', localSettings.value.selectedTheme);
        document.documentElement.setAttribute('data-bs-theme', displayedTheme());
    });

    return {
        localSettings,

        switchTheme,
        displayedTheme,
    };

});

export default usePlayerLocalSettingsStore;
