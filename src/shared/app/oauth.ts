/**
 * - openid: only get player public id
 * - read: read-only access to all player data (profile, games...)
 * - write: act on behalf of the player (create games, play moves...), implies read
 * - offline_access: get a refresh token, to keep access without asking player again
 */
export const OAUTH_SCOPES = ['openid', 'offline_access', 'read', 'write'] as const;

export type OAuthScope = typeof OAUTH_SCOPES[number];

export const isOAuthScope = (scope: string): scope is OAuthScope => (OAUTH_SCOPES as readonly string[]).includes(scope);

/**
 * "openid read write" => ["openid", "read", "write"]
 */
export const parseScope = (scope: undefined | null | string): string[] => (scope ?? '').split(' ').filter(Boolean);

export type OAuthClientInfo = {
    clientId: string;
    name: string;
    logoUri: string;
    author: string;
    websiteUri: null | string;
    description: null | string;
};

/**
 * Data displayed on the page where player authorizes an application.
 */
export type OAuthInteractionDetails = {
    client: OAuthClientInfo;
    scopes: string[];

    /**
     * Device flow only: code player entered, to check it matches the one displayed on the device.
     */
    userCode?: string;
};

/**
 * An application player has authorized.
 */
export type OAuthConnectedApplication = OAuthClientInfo & {
    scopes: string[];
    authorizedAt: Date;
};
