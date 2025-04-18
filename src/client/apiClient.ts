import qs from 'qs';
import { AIConfigStatusData, PlayHexContributors, WithRequired } from '../shared/app/Types.js';
import { HostedGameOptions, HostedGame, Player, ChatMessage, OnlinePlayers, PlayerSettings, AIConfig, GameAnalyze, Rating, PlayerStats, ConditionalMoves, PlayerPushSubscription, Tournament, TournamentCreateDTO, TournamentSubscription } from '../shared/app/models/index.js';
import { ErrorResponse, HandledErrorType } from '../shared/app/Errors.js';
import { instanceToPlain, plainToInstance } from '../shared/app/class-transformer-custom.js';
import { RatingCategory } from '../shared/app/ratingUtils.js';
import SearchGamesParameters from '../shared/app/SearchGamesParameters.js';
import { parse } from 'content-range';
import SearchPlayersParameters from '../shared/app/SearchPlayersParameters.js';

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
        }),
    });

    await checkResponse(response);

    return plainToInstance(Player, await response.json());
};

/**
 * Won't return active games, but can return created and playing games if persisted.
 */
export const getGames = async (searchGamesParameters: SearchGamesParameters = {}): Promise<{ results: HostedGame[], count: null | number }> => {
    const response = await fetch(`/api/games?${qs.stringify(searchGamesParameters)}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    const hostedGames = (await response.json() as HostedGame[])
        .map(hostedGame => plainToInstance(HostedGame, hostedGame))
    ;

    return {
        results: hostedGames,
        count: parse(response.headers.get('Content-Range') ?? '')?.size ?? null,
    };
};

export const getGamesStats = async (searchGamesParameters: SearchGamesParameters = {}): Promise<{ date: Date, totalGames: number }[]> => {
    const response = await fetch(`/api/games-stats?${qs.stringify(searchGamesParameters)}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    const results: { date: string, totalGames: number }[] = await response.json();

    return results.map(result => ({
        date: new Date(result.date),
        totalGames: result.totalGames,
    }));
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

export const getSearchPlayers = async (searchPlayersParameters: SearchPlayersParameters): Promise<Player[]> => {
    const response = await fetch(`/api/search/players?${qs.stringify(searchPlayersParameters)}`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    return (await response.json() as Player[])
        .map(player => plainToInstance(Player, player))
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

export const apiPostAskUndo = async (gameId: string): Promise<true | string> => {
    const response = await fetch(`/api/games/${gameId}/ask-undo`, {
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

export const apiPostAnswerUndo = async (gameId: string, accept: boolean): Promise<true | string> => {
    const response = await fetch(`/api/games/${gameId}/answer-undo`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            accept,
        }),
    });

    if (204 === response.status) {
        return true;
    }

    return response.text();
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

    if (404 === response.status) {
        return null;
    }

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

export const apiGetPlayerRatingHistory = async (playerPublicId: string, category: RatingCategory = 'overall'): Promise<null | Rating[]> => {
    const response = await fetch(`/api/players/${playerPublicId}/ratings/${category}`, {
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

export const apiGetPlayerCurrentRatings = async (playerPublicId: string): Promise<null | Rating[]> => {
    const response = await fetch(`/api/players/${playerPublicId}/current-ratings`, {
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

export const apiGetServerInfo = async (): Promise<{ version: string }> => {
    const response = await fetch('/api/server-info', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    return await response.json();
};

export const apiGetContributors = async (): Promise<PlayHexContributors> => {
    const response = await fetch('/api/contributors', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    return await response.json();
};

export const apiGetPlayerStats = async (playerPublicId: string): Promise<null | PlayerStats> => {
    const response = await fetch(`/api/players/${playerPublicId}/stats`, {
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

    return plainToInstance(PlayerStats, await response.json());
};

export const apiGetConditionalMoves = async (hostedGamePublicId: string): Promise<ConditionalMoves> => {
    const response = await fetch(`/api/games/${hostedGamePublicId}/conditional-moves`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(ConditionalMoves, await response.json());
};

export const apiPatchConditionalMoves = async (hostedGamePublicId: string, conditionalMoves: ConditionalMoves): Promise<ConditionalMoves> => {
    const response = await fetch(`/api/games/${hostedGamePublicId}/conditional-moves`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(instanceToPlain(conditionalMoves)),
    });

    await checkResponse(response);

    return plainToInstance(ConditionalMoves, await response.json());
};

export const apiGetPushSubscriptions = async (): Promise<PlayerPushSubscription[]> => {
    const response = await fetch(`/api/push-subscriptions`, {
        method: 'get',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return (await response.json() as PlayerPushSubscription[])
        .map(subscription => plainToInstance(PlayerPushSubscription, subscription))
    ;
};

export const apiPutPushSubscription = async (pushSubscription: PushSubscription): Promise<PlayerPushSubscription> => {
    const response = await fetch(`/api/push-subscriptions`, {
        method: 'put',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(pushSubscription),
    });

    await checkResponse(response);

    return plainToInstance(PlayerPushSubscription, await response.json());
};

export const apiPostPushTest = async (): Promise<void> => {
    const response = await fetch(`/api/push/test`, {
        method: 'post',
    });

    await checkResponse(response);
};

export const apiGetActiveTournaments = async (): Promise<null | Tournament[]> => {
    const response = await fetch(`/api/tournaments/active`);

    await checkResponse(response);

    return (await response.json() as Tournament[])
        .map(subscription => plainToInstance(Tournament, subscription))
    ;
};

export const apiGetEndedTournaments = async (): Promise<null | Tournament[]> => {
    const response = await fetch(`/api/tournaments`);

    await checkResponse(response);

    return (await response.json() as Tournament[])
        .map(subscription => plainToInstance(Tournament, subscription))
    ;
};

export const apiGetTournament = async (slug: string): Promise<null | Tournament> => {
    const response = await fetch(`/api/tournaments/${slug}`);

    if (404 === response.status) {
        return null;
    }

    await checkResponse(response);

    return plainToInstance(Tournament, await response.json());
};

export const apiPostTournament = async (tournamentCreateDTO: TournamentCreateDTO): Promise<null | Tournament> => {
    const response = await fetch(`/api/tournaments`, {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(instanceToPlain(tournamentCreateDTO)),
    });

    await checkResponse(response);

    return plainToInstance(Tournament, await response.json());
};

export const apiPutTournamentSubscription = async (tournamentSlug: string): Promise<null | TournamentSubscription> => {
    const response = await fetch(`/api/tournaments/${tournamentSlug}/subscriptions`, {
        method: 'put',
        headers: {
            'Accept': 'application/json',
        },
    });

    await checkResponse(response);

    return plainToInstance(TournamentSubscription, await response.json());
};
