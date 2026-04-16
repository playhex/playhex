import { defineOverlay } from '@overlastic/vue';
import { storeToRefs } from 'pinia';
import { HostedGame } from '../../../shared/app/models/index.js';
import useAuthStore from '../../stores/authStore.js';
import GuestJoiningCorrepondenceWarningOverlay from '../components/overlay/GuestJoiningCorrepondenceWarningOverlay.vue';
import { isCorrespondence } from '../../../shared/app/timeControlUtils.js';

export const useGuestJoiningCorrespondenceWarning = () => {
    /*
    * Warning on guest joining player correspondence game.
    *
    * To prevent guest accept a correspondence game without being aware of it
    * and going timeout, we show a confirm popin to tell what he is doing,
    * and invite to login/register.
    */
    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const createGuestJoiningCorrepondenceWarningOverlay: () => Promise<void> = defineOverlay(GuestJoiningCorrepondenceWarningOverlay);

    const isGuestJoiningCorrepondence = (hostedGame: HostedGame): boolean => {
        if (loggedInPlayer.value === null) {
            return false;
        }

        if (loggedInPlayer.value.isGuest && isCorrespondence(hostedGame)) {
            return true;
        }

        return false;
    };

    return {
        createGuestJoiningCorrepondenceWarningOverlay,
        isGuestJoiningCorrepondence,
    };
};
