import { defineStore } from 'pinia';
import { ref, watch, watchEffect } from 'vue';
import { Expose, instanceToPlain, plainToInstance } from '../../shared/app/class-transformer-custom.js';
import { OrientationMode } from '@playhex/pixi-board';

const LOCAL_SETTINGS_KEY = 'hex-local-settings';

export type DarkOrLight = 'dark' | 'light';
export type SelectedTheme = DarkOrLight | 'auto';

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

    /**
     * Public ids of the games whose chat I muted on this device:
     * no sound, and no unread messages badge, while I am on the game page.
     *
     * This is only about what happens while I am watching the game.
     * Whether I am notified when I am away is a server side setting,
     * see game chat subscriptions.
     */
    @Expose()
    mutedGameChats: string[] = [];
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

    /*
     * Game chats muted on this device
     */
    const isGameChatMuted = (gamePublicId: string): boolean => {
        return localSettings.value.mutedGameChats?.includes(gamePublicId) ?? false;
    };

    const toggleGameChatMute = (gamePublicId: string): void => {
        if (!localSettings.value.mutedGameChats) {
            localSettings.value.mutedGameChats = [];
        }

        const index = localSettings.value.mutedGameChats.indexOf(gamePublicId);

        if (index < 0) {
            localSettings.value.mutedGameChats.push(gamePublicId);
        } else {
            localSettings.value.mutedGameChats.splice(index, 1);
        }
    };

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
        isGameChatMuted,
        toggleGameChatMute,
    };

});

export default usePlayerLocalSettingsStore;
