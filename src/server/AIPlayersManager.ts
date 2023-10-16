import { Player, RandomAIPlayer } from '../shared/game-engine';
import { getMohexInstance, isMohexEnabled } from './mohex/queueableMohexInstance';
import MohexPlayer from './mohex/MohexPlayer';
import { GameOptionsData } from '@shared/app/GameOptions';

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns RandomAIPlayer if none available.
 */
const createAIPlayer = (gameOptions: GameOptionsData): Player => {
    if (
        isMohexEnabled()
        && gameOptions.boardsize
        && gameOptions.boardsize <= 13
    ) {
        return new MohexPlayer(getMohexInstance());
    }

    return new RandomAIPlayer();
};

export {
    createAIPlayer,
};
