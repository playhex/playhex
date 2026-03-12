import { computed, Ref } from 'vue';
import HostedGame from '../../../shared/app/models/HostedGame.js';
import { storeToRefs } from 'pinia';
import useAuthStore from '../../stores/authStore.js';
import { getCurrentPlayer, getPlayerIndex } from '../../../shared/app/hostedGameUtils.js';
import usePlayerSettingsStore from '../../stores/playerSettingsStore.js';
import { MoveSettings } from '../../../shared/app/models/PlayerSettings.js';
import { timeControlToCadencyName } from '../../../shared/app/timeControlUtils.js';

export const useHostedGameUtils = (hostedGame: Ref<null | HostedGame>) => {
    const { loggedInPlayer } = storeToRefs(useAuthStore());
    const { playerSettings } = storeToRefs(usePlayerSettingsStore());

    /**
     * Returns 0 if currently logged in player is red on this game, or 1 if blue.
     * Returns null if player is a watcher.
     */
    const localPlayerIndex = computed<null | number>(() => {
        if (loggedInPlayer.value === null || !hostedGame.value) {
            return null;
        }

        return getPlayerIndex(hostedGame.value, loggedInPlayer.value);
    });

    const isMyTurn = computed(() => {
        if (hostedGame.value === null || loggedInPlayer.value === null) {
            return false;
        }

        const currentPlayer = getCurrentPlayer(hostedGame.value);

        if (currentPlayer === null) {
            return false;
        }

        return currentPlayer.publicId === loggedInPlayer.value.publicId;
    });

    /**
     * Returns current MoveSettings for this player settings and this game time control cadency.
     * MoveSettings is whether we should submit move immediately or ask confirm.
     */
    const moveSettings = computed<null | MoveSettings>(() => {
        if (hostedGame.value === null || playerSettings.value === null) {
            return null;
        }

        return {
            blitz: playerSettings.value.moveSettingsBlitz,
            normal: playerSettings.value.moveSettingsNormal,
            correspondence: playerSettings.value.moveSettingsCorrespondence,
        }[timeControlToCadencyName(hostedGame.value)];
    });

    /**
     * Whether we should show the "Confirm move" button.
     * The button then should be disabled or enabled depending
     * on whether there is a pre-selected move to submit or not.
     */
    const shouldDisplayConfirmMove = computed<boolean>(() => {
        if (hostedGame.value === null) {
            return false;
        }

        // I am watcher
        if (localPlayerIndex.value === null) {
            return false;
        }

        // Game has ended. Still display button when game is not yet started to make sure it works
        if (hostedGame.value.state === 'ended') {
            return false;
        }

        return moveSettings.value === MoveSettings.MUST_CONFIRM;
    });

    return {
        localPlayerIndex,
        isMyTurn,
        moveSettings,
        shouldDisplayConfirmMove,
    };
};
