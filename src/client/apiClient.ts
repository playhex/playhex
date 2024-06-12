import { AIConfigStatusData, HostedGameState, WithRequired } from '@shared/app/Types';
import { HostedGameOptions, HostedGame, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze, Rating } from '../shared/app/models';
import { ErrorResponse, HandledErrorType } from '@shared/app/Errors';
import { plainToInstance } from '../shared/app/class-transformer-custom';
import { RatingCategory } from '../shared/app/ratingUtils';

export class ApiClientError extends Error
{
    type: HandledErrorType;
    reason: string;

    constructor(errorResponse: ErrorResponse)
    {
        super(`${errorResponse.type}: ${errorResponse.reason}`);

        this.type = errorResponse.type as HandledErrorType;
        this.reason = errorResponse.reason;
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

export const authGetMe = async (): Promise<Player> => {
    const response = await fetch('/api/auth/me', {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return plainToInstance(Player, await response.json());
};

export const authLogin = async (pseudo: string, password: string): Promise<Player> => {
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

    return plainToInstance(Player, await response.json());
};

export const authSignup = async (pseudo: string, password: string): Promise<Player> => {
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

    return plainToInstance(Player, await response.json());
};

export const authSignupFromGuest = async (pseudo: string, password: string): Promise<Player> => {
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

    return plainToInstance(Player, await response.json());
};

export const authMeOrSignupGuest = async (): Promise<Player> => {
    const response = await fetch('/api/auth/me-or-guest', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(Player, await response.json());
};

export const authLogout = async (): Promise<Player> => {
    const response = await fetch('/api/auth/logout', {
        method: 'delete',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(Player, await response.json());
};

export const authChangePassword = async (oldPassword: string, newPassword: string): Promise<Player> => {
    const response = await fetch('/api/auth/change-password', {
        method: 'post',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            oldPassword,
            newPassword,
        })
    });

    await checkResponse(response);

    return plainToInstance(Player, await response.json());
};

// TODO see if no need to pass type=lobby
export const getGames = async (): Promise<HostedGame[]> => {
    const response = await fetch(`/api/games`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return (await response.json() as HostedGame[])
        .map(hostedGame => plainToInstance(HostedGame, hostedGame))
    ;
};

export const getEndedGames = async (take = 20, fromGamePublicId: null | string = null): Promise<HostedGame[]> => {
    const params = new URLSearchParams({
        type: 'ended',
        take: String(take),
    });

    if (null !== fromGamePublicId) {
        params.append('fromGamePublicId', fromGamePublicId);
    }

    const response = await fetch(`/api/games?${params.toString()}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return (await response.json() as HostedGame[])
        .map(hostedGame => plainToInstance(HostedGame, hostedGame))
    ;
};

export const getPlayer = async (publicId: string): Promise<Player> => {
    const response = await fetch(`/api/players/${publicId}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return plainToInstance(Player, await response.json());
};

export const getPlayerBySlug = async (slug: string): Promise<Player> => {
    const response = await fetch(`/api/players?slug=${slug}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(Player, await response.json());
};

/**
 * @param fromGamePublicId Cursor
 */
export const getPlayerGames = async (
    playerPublicId: string,
    state: null | HostedGameState = null,
    fromGamePublicId: null | string = null,
): Promise<HostedGame[]> => {
    let url = `/api/players/${playerPublicId}/games`;
    const params = new URLSearchParams();

    if (null !== state) {
        params.append('state', state);
    }

    if (null !== fromGamePublicId) {
        params.append('fromGamePublicId', fromGamePublicId);
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

    return (await response.json() as HostedGame[])
        .map(hostedGame => plainToInstance(HostedGame, hostedGame))
    ;
};

export const getGame = async (gameId: string): Promise<null | HostedGame> => {
    const response = await fetch(`/api/games/${gameId}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        return null;
    }

    return plainToInstance(HostedGame, await response.json());
};

export const apiPostGame = async (gameOptions: Partial<HostedGameOptions> = {}): Promise<HostedGame> => {
    const response = await fetch('/api/games', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(gameOptions),
    });

    return plainToInstance(HostedGame, await response.json());
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

export const apiPostRematch = async (gameId: string): Promise<HostedGame> => {
    const response = await fetch(`/api/games/${gameId}/rematch`, {
        method: 'post',
        headers: {
            'Accept': 'application/json',
        },
    });

    return plainToInstance(HostedGame, await response.json());
};

export const apiGetOnlinePlayers = async (): Promise<OnlinePlayers> => {
    const response = await fetch(`/api/online-players`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return plainToInstance(OnlinePlayers, await response.json());
};

export const apiGetPlayerSettings = async (): Promise<PlayerSettings> => {
    const response = await fetch(`/api/player-settings`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return response.json();
};

export const apiPatchPlayerSettings = async (playerSettings: PlayerSettings): Promise<void> => {
    const response = await fetch(`/api/player-settings`, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(playerSettings),
    });

    await checkResponse(response);
};

export const apiPostChatMessage = async (chatMessage: Pick<ChatMessage, 'content' | 'hostedGameId'>): Promise<void> => {
    const response = await fetch(`/api/games/${chatMessage.hostedGameId}/chat-messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content: chatMessage.content,
        }),
    });

    await checkResponse(response);
};

export const apiGetAiConfigs = async (): Promise<WithRequired<AIConfig, 'player'>[]> => {
    const response = await fetch(`/api/ai-configs`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return await response.json();
};

export const apiGetAiConfigsStatus = async (): Promise<AIConfigStatusData> => {
    const response = await fetch(`/api/ai-configs-status`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return await response.json();
};

export const apiGetGameAnalyze = async (gamePublicId: string): Promise<null | GameAnalyze> => {
    const response = await fetch(`/api/games/${gamePublicId}/analyze`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    try {
        await checkResponse(response);
    } catch (e) {
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        return null;
    }

    return plainToInstance(GameAnalyze, await response.json());
};

export const apiRequestGameAnalyze = async (gamePublicId: string): Promise<GameAnalyze> => {
    const response = await fetch(`/api/games/${gamePublicId}/analyze`, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(GameAnalyze, await response.json());
};

export const apiGetGameRatingUpdates = async (gamePublicId: string, category: RatingCategory = 'overall'): Promise<null | Rating[]> => {
    const response = await fetch(`/api/games/${gamePublicId}/ratings/${category}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    try {
        await checkResponse(response);
    } catch (e) {
        if (!(e instanceof ApiClientError)) {
            throw e;
        }

        return null;
    }

    return (await response.json() as Rating[])
        .map(rating => plainToInstance(Rating, rating))
    ;
};
