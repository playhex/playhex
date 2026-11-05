import { computed, watch } from 'vue';
import { GameOptions } from '../../../shared/app/models/index.js';
import { normalizeHandicapOptions } from '../../../shared/app/handicap.js';

/**
 * Keep swap rule and first player consistent with handicap in create game forms.
 *
 * @param gameOptions Must be reactive
 */
export const useHandicapOptions = (gameOptions: GameOptions) => {
    watch(() => gameOptions.presetHandicap, (presetHandicap, previous) => {
        // Release swap rule that was disabled by half handicap
        if (presetHandicap === 0 && !Number.isInteger(previous)) {
            gameOptions.swapRule = true;
        }

        normalizeHandicapOptions(gameOptions);
    });

    return {
        swapRuleDisabled: computed(() => gameOptions.presetHandicap !== 0),
        firstPlayerDisabled: computed(() => !Number.isInteger(gameOptions.presetHandicap)),
    };
};
