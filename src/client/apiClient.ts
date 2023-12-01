import { HostedGameData, OnlinePlayersData, PlayerData } from '@shared/app/Types';
import { denormalize } from '@shared/app/serializer';
import { GameOptionsData } from '@shared/app/GameOptions';

export const loginAsGuest = async (): Promise<PlayerData> => {
    const response = await fetch('/auth/guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
};

export const getGames = async (): Promise<HostedGameData[]> => {
    const response = await fetch(`/api/games`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
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

    return denormalize(await response.json());
};

export const apiPostGame1v1 = async (gameOptions: Partial<GameOptionsData> = {}): Promise<HostedGameData> => {
    const response = await fetch('/api/games/1v1', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(gameOptions),
    });

    return denormalize(await response.json());
};

export const apiPostGameVsCPU = async (gameOptions: Partial<GameOptionsData> = {}): Promise<HostedGameData> => {
    const response = await fetch('/api/games/cpu', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(gameOptions),
    });

    return denormalize(await response.json());
};

export const apiPostResign = async (gameId: string): Promise<true | string> => {
    const response = await fetch(`/api/games/${gameId}/resign`, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (204 === response.status) {
        return true;
    }

    return response.text();
};

export const apiGetOnlinePlayers = async (): Promise<OnlinePlayersData> => {
    const response = await fetch(`/api/online-players`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return response.json();
};
