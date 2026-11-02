import type { NextFunction, Request, Response } from 'express';
import { getBearerToken, resolveOAuthAccess, resolveOAuthClientAccess } from './oauthAccess.js';
import { checkOAuthApiPolicy, checkOAuthClientApiPolicy, type OAuthApiPolicyResult } from './oauthApiPolicy.js';
import logger from '../services/logger.js';

const deny = (res: Response, result: OAuthApiPolicyResult & { allowed: false }): void => {
    if (result.reason === 'insufficient_scope') {
        res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${result.requiredScope}"`);
    }

    res.status(403).send({
        error: result.reason,
        error_description: result.reason === 'insufficient_scope'
            ? `This route requires the "${result.requiredScope}" scope`
            : 'This route cannot be called by a third-party application',
    });
};

/**
 * Authenticates api requests made by third-party applications
 * with an OAuth access token ("Authorization: Bearer xxx"),
 * and checks token scopes against the called route.
 *
 * Bearer tokens which are not OAuth access tokens (admin password, AI worker keys)
 * are ignored here and handled by their own controllers.
 */
export const oauthApiMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = getBearerToken(req.headers);

    if (token === null) {
        next();
        return;
    }

    try {
        const path = req.baseUrl + req.path;

        // Application acting on behalf of a player
        const oauthAccess = await resolveOAuthAccess(token);

        if (oauthAccess !== null) {
            const result = checkOAuthApiPolicy(req.method, path, oauthAccess.scopes);

            if (!result.allowed) {
                deny(res, result);
                return;
            }

            req.oauth = oauthAccess;
            next();
            return;
        }

        // Application acting on its own (client_credentials), not on behalf of a player
        const oauthClientAccess = await resolveOAuthClientAccess(token);

        if (oauthClientAccess === null) {
            next();
            return;
        }

        const result = checkOAuthClientApiPolicy(req.method, path, oauthClientAccess.scopes);

        if (!result.allowed) {
            deny(res, result);
            return;
        }

        req.oauthClient = oauthClientAccess;
        next();
    } catch (e) {
        logger.error('Error while resolving OAuth access token', { errorMessage: (e as Error)?.message });
        next(e);
    }
};
