import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { LadderDto, LadderMeDto } from '../../../../shared/app/models/LadderDto.js';
import { apiGetLadder, apiGetLadderMe } from '../../../apiClient.js';
import useAuthStore from '../../../stores/authStore.js';
import useToastsStore from '../../../stores/toastsStore.js';
import { t } from 'i18next';

/**
 * Loads ladder from url slug, and my state in this ladder.
 */
export const useLadderFromUrl = () => {
    const { slug } = useRoute().params;

    if (Array.isArray(slug)) {
        throw new Error('Unexpected array in slug parameter');
    }

    const { loggedInPlayer } = storeToRefs(useAuthStore());

    /**
     * null: loading, false: not found
     */
    const ladderDto = ref<null | false | LadderDto>(null);

    /**
     * null if not logged in or not loaded
     */
    const me = ref<null | LadderMeDto>(null);

    const reload = async (): Promise<void> => {
        try {
            const [ladder, myState] = await Promise.all([
                apiGetLadder(slug),
                loggedInPlayer.value === null ? Promise.resolve(null) : apiGetLadderMe(slug),
            ]);

            ladderDto.value = ladder ?? false;
            me.value = myState;
        } catch (e) {
            useToastsStore().addToast(t('ladder.load_error'), { level: 'danger' });
        }
    };

    void reload();

    // Reload my state once logged in (or logged in as another player)
    watch(() => loggedInPlayer.value?.publicId, () => void reload());

    return {
        slug,
        ladderDto,
        me,
        reload,
    };
};
