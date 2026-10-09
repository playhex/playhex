import type { NextFunction, Request, Response } from 'express';
import { getBearerToken, resolveOAuthAccess } from './oauthAccess.js';
import { checkOAuthApiPolicy } from './oauthApiPolicy.js';
import logger from '../services/logger.js';

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
        const oauthAccess = await resolveOAuthAccess(token);

        if (oauthAccess === null) {
            next();
            return;
        }

        const path = req.baseUrl + req.path;
        const result = checkOAuthApiPolicy(req.method, path, oauthAccess.scopes);

        if (!result.allowed) {
            if (result.reason === 'insufficient_scope') {
                res.set('WWW-Authenticate', `Bearer error="insufficient_scope", scope="${result.requiredScope}"`);
            }

            res.status(403).send({
                error: result.reason,
                error_description: result.reason === 'insufficient_scope'
                    ? `This route requires the "${result.requiredScope}" scope`
                    : 'This route cannot be called by a third-party application',
            });
            return;
        }

        req.oauth = oauthAccess;
        next();
    } catch (e) {
        logger.error('Error while resolving OAuth access token', { errorMessage: (e as Error)?.message });
        next(e);
    }
};
