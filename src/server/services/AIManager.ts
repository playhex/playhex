import RemoteApiPlayer from '../RemoteApiPlayer';
import { Player, DeterministRandomAIPlayer } from '../../shared/game-engine';
import { GameOptionsData } from '@shared/app/GameOptions';

const { MOHEX_API_ENDPOINT } = process.env;

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns DeterministRandomAIPlayer if none available.
 */
const createAIPlayer = (gameOptions: GameOptionsData): Player => {
    if (
        MOHEX_API_ENDPOINT
        && gameOptions.boardsize
        && gameOptions.boardsize <= 13
    ) {
        return new RemoteApiPlayer('Mohex', MOHEX_API_ENDPOINT);
    }

    return new DeterministRandomAIPlayer();
};

export {
    createAIPlayer,
};
