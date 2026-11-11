import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { t } from 'i18next';
import useSocketStore from './socketStore.js';
import useToastsStore from './toastsStore.js';
import useAuthStore from './authStore.js';
import usePlayerSettingsStore from './playerSettingsStore.js';
import { apiDeleteMatchmaking, apiGetMatchmakingStatus, apiPostMatchmaking } from '../apiClient.js';
import {
    createDefaultMatchmakingPreferences,
    isValidMatchmakingPreferences,
    type MatchmakingPreferences,
    type MatchmakingStatus,
} from '../../shared/app/matchmaking/matchmakingRules.js';

/**
 * Matchmaking: my search state, my preferences,
 * redirects to game when matched.
 */
const useMatchmakingStore = defineStore('matchmakingStore', () => {

    const router = useRouter();
    const { socket } = useSocketStore();
    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const playerSettingsStore = usePlayerSettingsStore();
    const { playerSettings } = storeToRefs(playerSettingsStore);

    const status = ref<null | MatchmakingStatus>(null);
    const searching = computed(() => status.value !== null);

    /**
     * Request in progress (entering), before status is known
     */
    const entering = ref(false);

    /**
     * Preferences being edited, initialized from player settings.
     */
    const preferences = ref<MatchmakingPreferences>(createDefaultMatchmakingPreferences());

    /**
     * Not structuredClone(): would throw on vue reactive proxies
     */
    const clonePreferences = (preferences: MatchmakingPreferences): MatchmakingPreferences => ({
        boardsizes: { ...preferences.boardsizes },
    });

    watch(playerSettings, settings => {
        const saved = settings?.matchmakingPreferences;

        if (saved && isValidMatchmakingPreferences(saved)) {
            preferences.value = clonePreferences(saved);
        }
    }, { immediate: true });

    const savePreferences = async (): Promise<void> => {
        if (playerSettings.value === null) {
            return;
        }

        playerSettings.value.matchmakingPreferences = clonePreferences(preferences.value);
        await playerSettingsStore.updatePlayerSettings();
    };

    /**
     * Game page from which "play again" was clicked:
     * still redirect to the new game when matched while being on this page.
     */
    let playAgainFromGameId: null | string = null;

    /**
     * @param avoidPlayerPublicId Play again: avoid same opponent if possible
     * @param fromGameId Play again: game page we are currently on
     */
    const enter = async (avoidPlayerPublicId: null | string = null, fromGameId: null | string = null): Promise<void> => {
        if (!isValidMatchmakingPreferences(preferences.value)) {
            return;
        }

        if (avoidPlayerPublicId !== null || fromGameId !== null) {
            playAgainFromGameId = fromGameId;
        } else if (!searching.value) {
            playAgainFromGameId = null;
        }

        // Server saves preferences when entering, keep local settings in sync
        // so that a later player settings patch does not revert them
        if (playerSettings.value !== null) {
            playerSettings.value.matchmakingPreferences = clonePreferences(preferences.value);
        }

        entering.value = true;

        try {
            status.value = await apiPostMatchmaking(preferences.value, avoidPlayerPublicId);
        } finally {
            entering.value = false;
        }
    };

    const leave = async (): Promise<void> => {
        status.value = null;
        await apiDeleteMatchmaking();
    };

    /**
     * Preferences changed: save them, and update queue if searching.
     * Debounced to send only once when clicking on several boardsizes.
     */
    let updateTimeout: null | ReturnType<typeof setTimeout> = null;

    const onPreferencesChanged = (): void => {
        if (updateTimeout !== null) {
            clearTimeout(updateTimeout);
        }

        updateTimeout = setTimeout(() => {
            updateTimeout = null;

            if (!isValidMatchmakingPreferences(preferences.value)) {
                return;
            }

            if (searching.value) {
                // Server saves preferences when entering
                void enter();
                return;
            }

            void savePreferences();
        }, 800);
    };

    const refreshStatus = async (): Promise<void> => {
        if (loggedInPlayer.value === null) {
            status.value = null;
            return;
        }

        status.value = await apiGetMatchmakingStatus();
    };

    socket.on('matchmakingStatus', newStatus => {
        status.value = newStatus;
    });

    /**
     * Do not redirect if player is currently on another game page
     * (watching or reviewing a game), show a toast with a link instead.
     */
    const isOnAnotherGamePage = (gamePublicId: string): boolean => {
        const { name, params } = router.currentRoute.value;

        if (name !== 'online-game') {
            return false;
        }

        return params.gameId !== gamePublicId && params.gameId !== playAgainFromGameId;
    };

    socket.on('matchmakingMatched', gamePublicId => {
        status.value = null;

        if (isOnAnotherGamePage(gamePublicId)) {
            useToastsStore().addToast(t('matchmaking.matched_toast'), {
                level: 'success',
                autoCloseAfter: 0,
                actions: [{
                    label: t('matchmaking.matched_toast_open'),
                    action: { name: 'online-game', params: { gameId: gamePublicId } },
                    classes: 'btn btn-success',
                }],
            });

            return;
        }

        void router.push({ name: 'online-game', params: { gameId: gamePublicId } });
    });

    // Resync on reconnect, i.e after server restart queue is lost
    socket.on('connect', () => void refreshStatus().catch(() => {}));

    watch(loggedInPlayer, () => void refreshStatus().catch(() => {}), { immediate: true });

    return {
        status,
        searching,
        entering,
        preferences,
        enter,
        leave,
        onPreferencesChanged,
    };
});

export default useMatchmakingStore;
