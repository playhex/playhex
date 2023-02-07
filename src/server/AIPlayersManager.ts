import { Player, RandomAIPlayer } from '../shared/game-engine';
import queueableMohexInstance from './mohex/queueableMohexInstance';
import MohexPlayer from './mohex/MohexPlayer';

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns RandomAIPlayer if none available.
 */
const createAIPlayer = (): Player => {
    if (null !== queueableMohexInstance) {
        return new MohexPlayer(queueableMohexInstance);
    }

    return new RandomAIPlayer();
};

export {
    createAIPlayer,
};
