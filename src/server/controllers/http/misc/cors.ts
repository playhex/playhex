import { Express } from 'express';
import cors from 'cors';
import { isOAuthClientOrigin } from '../../../oauth/oauthClientOrigins.js';
import { OIDC_PATH_PREFIX } from '../../../oauth/provider.js';

const isPathUnder = (path: string, prefix: string): boolean => path === prefix || path.startsWith(prefix + '/');

export const registerCors = (app: Express): void => {
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map(s => s.trim()).filter(Boolean)
    ;

    /*
     * Api is open to origins explicitly allowed in CORS_ALLOWED_ORIGINS,
     * and to OAuth applications origins (from their redirect uris),
     * so their browser front can call it with an access token (Authorization: Bearer).
     * Credentials are not allowed, so cookies are never used cross-origin:
     * a foreign site cannot act with the player session.
     */
    app.use('/api', cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, !!origin);
                return;
            }

            isOAuthClientOrigin(origin).then(
                allowed => callback(null, allowed),
                () => callback(null, false),
            );
        },
        allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
        exposedHeaders: ['Content-Range', 'WWW-Authenticate'],
        maxAge: 86400,
    }));

    if (allowedOrigins.length > 0) {
        const allowedOriginsCors = cors({
            origin: allowedOrigins,
        });

        app.use((req, res, next) => {
            // Api already handled above, oidc-provider handles its own CORS (see clientBasedCORS)
            const path = req.path.toLowerCase(); // express mounts are case insensitive

            if (isPathUnder(path, '/api') || isPathUnder(path, OIDC_PATH_PREFIX)) {
                next();
                return;
            }

            allowedOriginsCors(req, res, next);
        });
    }
};
