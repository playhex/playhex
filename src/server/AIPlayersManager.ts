import { Player, RandomAIPlayer } from '../shared/game-engine';
import queueableMohexInstance from './mohex/queueableMohexInstance';
import MohexPlayer from './mohex/MohexPlayer';
import { GameOptionsData } from '@shared/app/GameOptions';

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns RandomAIPlayer if none available.
 */
const createAIPlayer = (gameOptions: GameOptionsData): Player => {
    if (
        null !== queueableMohexInstance
        && gameOptions.boardsize
        && gameOptions.boardsize <= 13
    ) {
        return new MohexPlayer(queueableMohexInstance);
    }

    return new RandomAIPlayer();
};

export {
    createAIPlayer,
};
