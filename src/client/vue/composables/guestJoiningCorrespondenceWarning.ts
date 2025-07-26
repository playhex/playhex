import { defineOverlay } from '@overlastic/vue';
import { storeToRefs } from 'pinia';
import { HostedGame } from '../../../shared/app/models/index.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';
import useAuthStore from '../../stores/authStore.js';
import GuestJoiningCorrepondenceWarningOverlay from '../components/overlay/GuestJoiningCorrepondenceWarningOverlay.vue';

export const useGuestJoiningCorrespondenceWarning = () => {
    /*
    * Warning on guest joining player correspondence game.
    *
    * To prevent guest accept a correspondence game without being aware of it
    * and going timeout, we show a confirm popin to tell what he is doing,
    * and invite to login/register.
    */
    const { loggedInPlayer } = storeToRefs(useAuthStore());

    const createGuestJoiningCorrepondenceWarningOverlay: () => void = defineOverlay(GuestJoiningCorrepondenceWarningOverlay);

    const isGuestJoiningCorrepondence = (hostedGame: HostedGame): boolean => {
        if (loggedInPlayer.value === null) {
            return false;
        }

        if (loggedInPlayer.value.isGuest && timeControlToCadencyName(hostedGame.gameOptions) === 'correspondence') {
            return true;
        }

        return false;
    };

    return {
        createGuestJoiningCorrepondenceWarningOverlay,
        isGuestJoiningCorrepondence,
    };
};
