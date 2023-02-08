import { HostedGameData, PlayerData } from '@shared/app/Types';
import { GameOptionsData } from '@shared/app/GameOptions';

export const loginAsGuest = async (): Promise<PlayerData> => {
    const response = await fetch('/auth/guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    return response.json();
};

export const getGames = async (): Promise<HostedGameData[]> => {
    const response = await fetch(`/api/games`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return response.json();
};

export const getGame = async (gameId: string): Promise<null | HostedGameData> => {
    const response = await fetch(`/api/games/${gameId}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
};

export const apiPostGame1v1 = async (gameOptions: GameOptionsData = {}): Promise<HostedGameData> => {
    const response = await fetch('/api/games/1v1', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(gameOptions),
    });

    return response.json();
};

export const apiPostGameVsCPU = async (gameOptions: GameOptionsData = {}): Promise<HostedGameData> => {
    const response = await fetch('/api/games/cpu', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(gameOptions),
    });

    return response.json();
};
