import RemoteApiPlayer from '../RemoteApiPlayer';
import { DeterministRandomAIPlayer } from '../../shared/game-engine';
import { GameOptionsData } from '@shared/app/GameOptions';
import AppPlayer from '@shared/app/AppPlayer';

const { HEX_AI_API_ENDPOINT } = process.env;

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns DeterministRandomAIPlayer if none available.
 */
const createAIPlayer = (gameOptions: GameOptionsData): AppPlayer => {
    if (
        HEX_AI_API_ENDPOINT
        && gameOptions.boardsize
        && gameOptions.boardsize <= 13
    ) {
        return new RemoteApiPlayer('Mohex', HEX_AI_API_ENDPOINT);
    }

    return new DeterministRandomAIPlayer();
};

export {
    createAIPlayer,
};
