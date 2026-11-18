import { ref, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetMyRetrospectives } from '../../../apiClient.js';
import { areRetrospectivesListed } from '../../../../shared/app/retrospective/retrospectiveRules.js';
import type { PlayerRetrospectiveSummary } from '../../../../shared/app/retrospective/retrospectiveTypes.js';

/**
 * Null while loading.
 */
const retrospectives = ref<null | PlayerRetrospectiveSummary[]>(null);

let initialized = false;

/**
 * Published retrospectives of logged in player (see apiGetMyRetrospectives()),
 * fetched once per logged in player, and shared between components (menu, lobby, profile...).
 * Empty for guests, or if the request failed.
 */
export const useMyRetrospectives = (): Ref<null | PlayerRetrospectiveSummary[]> => {
    if (initialized) {
        return retrospectives;
    }

    initialized = true;

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    watch(loggedInPlayer, async player => {
        retrospectives.value = null;

        if (player === null) {
            return;
        }

        if (player.isGuest || !areRetrospectivesListed()) {
            retrospectives.value = [];
            return;
        }

        let fetched: PlayerRetrospectiveSummary[] = [];

        try {
            fetched = await apiGetMyRetrospectives();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not load retrospectives', e);
        }

        // Ignore response if player changed (logout, login...) meanwhile
        if (loggedInPlayer.value?.publicId === player.publicId) {
            retrospectives.value = fetched;
        }
    }, { immediate: true });

    return retrospectives;
};
