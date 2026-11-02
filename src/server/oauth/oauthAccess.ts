import { Container } from 'typedi';
import type { IncomingHttpHeaders } from 'http';
import { getOidcProvider } from './provider.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import { Player } from '../../shared/app/models/index.js';
import { parseScope } from '../../shared/app/oauth.js';

/**
 * A player authenticated through an OAuth access token, i.e a third-party application acting on his behalf.
 */
export type OAuthAccess = {
    player: Player;
    clientId: string;
    scopes: Set<string>;
};

/**
 * An application authenticated through an OAuth access token issued with client_credentials grant,
 * acting on its own, not on behalf of a player (e.g Discord bot).
 */
export type OAuthClientAccess = {
    clientId: string;
    scopes: Set<string>;
};

declare module 'http' {
    interface IncomingMessage {
        /**
         * Set when request is authenticated by an OAuth access token instead of session cookie.
         */
        oauth?: OAuthAccess;

        /**
         * Set when request is authenticated by an application OAuth access token (client_credentials).
         * No player then.
         */
        oauthClient?: OAuthClientAccess;
    }
}

/**
 * Get token from "Authorization: Bearer xxx" header, if any.
 */
export const getBearerToken = (headers: IncomingHttpHeaders): null | string => {
    const match = headers.authorization?.match(/^Bearer\s+(\S+)$/i);

    return match ? match[1] : null;
};

/**
 * Returns null if token is not a valid OAuth access token
 * (unknown, expired, revoked, client disabled, player deleted).
 * Note that admin passwords and AI worker keys are also sent as Bearer tokens,
 * and will return null here.
 */
export const resolveOAuthAccess = async (token: string): Promise<null | OAuthAccess> => {
    const provider = getOidcProvider();
    const accessToken = await provider.AccessToken.find(token);

    if (!accessToken || accessToken.isExpired || !accessToken.accountId || !accessToken.clientId) {
        return null;
    }

    const client = await provider.Client.find(accessToken.clientId);

    if (!client) {
        return null;
    }

    const player = await Container.get(PlayerRepository).getPlayer(accessToken.accountId);

    if (player === null) {
        return null;
    }

    return {
        player,
        clientId: accessToken.clientId,
        scopes: new Set(parseScope(accessToken.scope)),
    };
};

/**
 * Returns null if token is not a valid application access token
 * (unknown, expired, client disabled, or a token issued on behalf of a player).
 */
export const resolveOAuthClientAccess = async (token: string): Promise<null | OAuthClientAccess> => {
    const provider = getOidcProvider();
    const clientCredentials = await provider.ClientCredentials.find(token);

    if (!clientCredentials || clientCredentials.isExpired || !clientCredentials.clientId) {
        return null;
    }

    const client = await provider.Client.find(clientCredentials.clientId);

    if (!client) {
        return null;
    }

    return {
        clientId: clientCredentials.clientId,
        scopes: new Set(parseScope(clientCredentials.scope)),
    };
};
