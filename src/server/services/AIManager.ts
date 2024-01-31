import { GameOptionsData } from '@shared/app/GameOptions';
import { PlayerData } from '@shared/app/Types';

const { HEX_AI_API_ENDPOINT } = process.env;

const mohexPlayerData: PlayerData = {
    publicId: 'afe7a449-6980-4181-9754-41bbfa2b92bc',
    isBot: true,
    isGuest: false,
    pseudo: 'Mohex',
    slug: 'mohex',
    createdAt: new Date('2009-06-01'),
};

const deterministRandomBot: PlayerData = {
    publicId: '77656f2d-0d80-48ba-b2d3-8f2816ced08c',
    isBot: true,
    isGuest: false,
    pseudo: 'Determinist random bot',
    slug: 'determinist-random-bot',
    createdAt: new Date('2023-01-01'),
};

/**
 * Create an AI Player instance
 * depending on available AI engine available.
 * Returns DeterministRandomAIPlayer if none available.
 */
const createAIPlayer = (gameOptions: GameOptionsData): PlayerData => {
    if (
        HEX_AI_API_ENDPOINT
        && gameOptions.boardsize
        && gameOptions.boardsize <= 13
    ) {
        return mohexPlayerData;
    }

    return deterministRandomBot;
};

export {
    createAIPlayer,
};
