import { ref } from 'vue';
import { useRoute } from 'vue-router';
import Tournament from '../../../../shared/app/models/Tournament.js';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetTournament } from '../../../apiClient.js';

export const useTournamentFromUrl = () => {
    const { slug } = useRoute().params;
    const tournament = ref<null | false | Tournament>(null);

    if (Array.isArray(slug)) {
        throw new Error('Unexpected array in slug parameter');
    }

    (async () => {
        tournament.value = await apiGetTournament(slug) ?? false;
    })();

    /**
     * @returns null When not yet loaded, else boolean whether actual player is host
     */
    const iAmHost = (): null | boolean => {
        if (!tournament.value) {
            return null;
        }

        const { loggedInPlayer } = useAuthStore();

        if (loggedInPlayer === null) {
            return false;
        }

        return tournament.value.organizer.publicId === loggedInPlayer.publicId;
    };

    return {
        slug,
        tournament,
        iAmHost,
    };
};
