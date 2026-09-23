import { defineOverlay } from '@overlastic/vue';
import { useRouter } from 'vue-router';
import { Ladder, Player } from '../../../../shared/app/models/index.js';
import type TimeControlType from '../../../../shared/time-control/TimeControlType.js';
import { apiPostLadderChallenge } from '../../../apiClient.js';
import LadderChallengeOverlay from '../components/LadderChallengeOverlay.vue';

export type LadderChallengeOverlayResult = {
    boardsize: number;
    liveTimeControlType: null | TimeControlType;
};

const ladderChallengeOverlay = defineOverlay(LadderChallengeOverlay);

/**
 * Opens challenge overlay, sends challenge,
 * then goes to game page, or calls onPendingLive if a live game has been proposed.
 */
export const useLadderChallenge = () => {
    const router = useRouter();

    const challenge = async (ladder: Ladder, defender: Player, onPendingLive: () => void): Promise<void> => {
        let result: LadderChallengeOverlayResult;

        try {
            result = await ladderChallengeOverlay({ ladder, defender });
        } catch (e) {
            // closed overlay
            return;
        }

        const ladderChallenge = await apiPostLadderChallenge(ladder.slug, defender.publicId, result.boardsize, result.liveTimeControlType);

        if (ladderChallenge.game) {
            await router.push({ name: 'online-game', params: { gameId: ladderChallenge.game.publicId } });
            return;
        }

        onPendingLive();
    };

    return {
        challenge,
    };
};
