import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { TournamentSeriesDto } from '../../../../shared/app/models/TournamentSeriesDto.js';
import useAuthStore from '../../../stores/authStore.js';
import { apiGetTournamentSeries } from '../../../apiClient.js';

export const useTournamentSeriesFromUrl = () => {
    const { slug } = useRoute().params;

    if (Array.isArray(slug)) {
        throw new Error('Unexpected array in slug parameter');
    }

    /**
     * null: loading, false: not found
     */
    const tournamentSeries = ref<null | false | TournamentSeriesDto>(null);

    const reload = async (): Promise<void> => {
        tournamentSeries.value = await apiGetTournamentSeries(slug) ?? false;
    };

    void reload();

    /**
     * @returns null When not yet loaded, else whether current player is host or admin of this series
     */
    const iAmHost = (): null | boolean => {
        if (!tournamentSeries.value) {
            return null;
        }

        const { loggedInPlayer } = useAuthStore();

        if (loggedInPlayer === null) {
            return false;
        }

        return tournamentSeries.value.host.publicId === loggedInPlayer.publicId
            || tournamentSeries.value.admins.some(admin => admin.publicId === loggedInPlayer.publicId)
        ;
    };

    return {
        slug,
        tournamentSeries,
        iAmHost,
        reload,
    };
};
