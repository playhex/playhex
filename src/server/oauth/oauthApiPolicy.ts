import type { OAuthScope } from '../../shared/app/oauth.js';

/**
 * Api routes that a third-party application can never call on behalf of a player,
 * even with "write" scope: authentication, security, admin, device-bound features.
 * Case insensitive, like express routing: "/API/Auth/login" reaches "/api/auth/login".
 */
const DENIED_ROUTES: { method?: string, pattern: RegExp }[] = [
    { pattern: /^\/api\/auth(\/|$)/i }, // login, signup, logout, change-password... (GET /api/auth/me allowed below)
    { pattern: /^\/api\/oauth(\/|$)/i }, // managing connected applications
    { pattern: /^\/api\/admin(\/|$)/i },
    { pattern: /^\/api\/ai-workers(\/|$)/i },
    { pattern: /^\/api\/player-ai-worker-keys(\/|$)/i },
    { pattern: /^\/api\/push-subscriptions(\/|$)/i },
    { pattern: /^\/api\/push(\/|$)/i },
    { pattern: /^\/api\/players\/me\/little-golem(\/|$)/i, method: 'PUT' }, // linking an external account
    { pattern: /^\/api\/players\/me\/little-golem(\/|$)/i, method: 'DELETE' },
    { pattern: /^\/api\/player-moderation-actions(\/|$)/i, method: 'PATCH' }, // acknowledging moderation warnings
];

const ALLOWED_ROUTES: { method: string, pattern: RegExp }[] = [
    { method: 'GET', pattern: /^\/api\/auth\/me$/i },
];

export const canWrite = (scopes: Set<string>): boolean => scopes.has('write');

export const canRead = (scopes: Set<string>): boolean => scopes.has('read') || canWrite(scopes);

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export type OAuthApiPolicyResult =
    | { allowed: true }
    | { allowed: false, reason: 'route_not_allowed' | 'insufficient_scope', requiredScope?: OAuthScope }
;

/**
 * Whether an access token with given scopes can call this api route.
 * "write" implies "read". A token with only "openid" cannot call the api, only the userinfo endpoint.
 */
export const checkOAuthApiPolicy = (method: string, path: string, scopes: Set<string>): OAuthApiPolicyResult => {
    method = method.toUpperCase();

    const explicitlyAllowed = ALLOWED_ROUTES.some(route => route.method === method && route.pattern.test(path));

    if (!explicitlyAllowed && DENIED_ROUTES.some(route => (route.method === undefined || route.method === method) && route.pattern.test(path))) {
        return { allowed: false, reason: 'route_not_allowed' };
    }

    if (READ_METHODS.includes(method)) {
        return canRead(scopes)
            ? { allowed: true }
            : { allowed: false, reason: 'insufficient_scope', requiredScope: 'read' }
        ;
    }

    return canWrite(scopes)
        ? { allowed: true }
        : { allowed: false, reason: 'insufficient_scope', requiredScope: 'write' }
    ;
};
