import { computed, watch } from 'vue';
import { GameOptions } from '../../../shared/app/models/index.js';

/**
 * Keep closed game option consistent with other options in create game forms.
 *
 * @param gameOptions Must be reactive
 */
export const useClosedGameOption = (gameOptions: GameOptions) => {
    // The invited friend may not have an account yet
    watch(() => gameOptions.closed, closed => {
        if (closed) {
            gameOptions.opponentMustBeRegistered = false;
        }
    });

    // A challenge is already reserved to a player
    watch(() => gameOptions.opponentPublicId, opponentPublicId => {
        if (opponentPublicId !== null) {
            gameOptions.closed = false;
        }
    });

    return {
        closedDisabled: computed(() => gameOptions.opponentPublicId !== null),
    };
};
