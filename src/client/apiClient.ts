import { HostedGameData, PlayerData } from '@shared/app/Types';
import { deserialize } from '@shared/app/serializer';
import { GameOptionsData } from '@shared/app/GameOptions';

export const loginAsGuest = async (): Promise<PlayerData> => {
    const response = await fetch('/auth/guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    return deserialize(await response.text());
};

export const getGames = async (): Promise<HostedGameData[]> => {
    const response = await fetch(`/api/games`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return deserialize(await response.text());
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

    return deserialize(await response.text());
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

    return deserialize(await response.text());
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

    return deserialize(await response.text());
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
