import { HostedGameData, HostedGameState, OnlinePlayersData, PlayerData, PlayerSettingsData } from '@shared/app/Types';
import { ErrorResponse, HandledErrorType } from '@shared/app/Errors';
import { denormalize } from '@shared/app/serializer';
import { GameOptionsData } from '@shared/app/GameOptions';

export class ApiClientError extends Error
{
    type: HandledErrorType;
    details: string;

    constructor(errorResponse: ErrorResponse)
    {
        super(`${errorResponse.type}: ${errorResponse.details}`);

        this.type = errorResponse.type as HandledErrorType;
        this.details = errorResponse.details;
    }
}

const checkResponse = async (response: Response): Promise<void> => {
    if (response.ok) {
        return;
    }

    if (response.status >= 400 && response.status < 500) {
        throw new ApiClientError(await response.json());
    }

    if (response.status >= 500) {
        throw new Error('Server error');
    }
};

export const authGetMe = async (): Promise<PlayerData> => {
    const response = await fetch('/api/auth/me', {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
};

export const authLogin = async (pseudo: string, password: string): Promise<PlayerData> => {
    const response = await fetch('/api/auth/login', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pseudo,
            password,
        }),
    });

    await checkResponse(response);

    return denormalize(await response.json());
};

export const authSignup = async (pseudo: string, password: string): Promise<PlayerData> => {
    const response = await fetch('/api/auth/signup', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pseudo,
            password,
        }),
    });

    await checkResponse(response);

    return denormalize(await response.json());
};

export const authSignupFromGuest = async (pseudo: string, password: string): Promise<PlayerData> => {
    const response = await fetch('/api/auth/signup-from-guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pseudo,
            password,
        }),
    });

    await checkResponse(response);

    return denormalize(await response.json());
};

export const authMeOrSignupGuest = async (): Promise<PlayerData> => {
    const response = await fetch('/api/auth/me-or-guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return denormalize(await response.json());
};

export const authLogout = async (): Promise<PlayerData> => {
    const response = await fetch('/api/auth/logout', {
        method: 'delete',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    await checkResponse(response);

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

export const getEndedGames = async (take: number = 20, publicId: null | string = null): Promise<HostedGameData[]> => {
    const params = new URLSearchParams({
        type: 'ended',
        take: String(take),
    });

    if (null !== publicId) {
        params.append('publicId', publicId);
    }

    const response = await fetch(`/api/games?${params.toString()}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
};

export const getPlayer = async (publicId: string): Promise<PlayerData> => {
    const response = await fetch(`/api/players/${publicId}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
};

export const getPlayerBySlug = async (slug: string): Promise<PlayerData> => {
    const response = await fetch(`/api/players?slug=${slug}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return denormalize(await response.json());
};

/**
 * @param publicId Cursor
 */
export const getPlayerGames = async (
    playerPublicId: string,
    state: null | HostedGameState = null,
    publicId: null | string = null,
): Promise<HostedGameData[]> => {
    let url = `/api/players/${playerPublicId}/games`;
    const params = new URLSearchParams();

    if (null !== state) {
        params.append('state', state);
    }

    if (null !== publicId) {
        params.append('publicId', publicId);
    }

    if (params.size > 0) {
        url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
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

export const apiPostGame = async (gameOptions: Partial<GameOptionsData> = {}): Promise<HostedGameData> => {
    const response = await fetch('/api/games', {
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

export const apiPostCancel = async (gameId: string): Promise<true | string> => {
    const response = await fetch(`/api/games/${gameId}/cancel`, {
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

export const apiGetPlayerSettings = async (): Promise<PlayerSettingsData> => {
    const response = await fetch(`/api/player-settings`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return response.json();
};

export const apiPatchPlayerSettings = async (playerSettingsData: PlayerSettingsData): Promise<PlayerSettingsData> => {
    const response = await fetch(`/api/player-settings`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerSettingsData),
    });

    return response.json();
};
