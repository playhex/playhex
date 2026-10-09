import crypto from 'node:crypto';
import { Container } from 'typedi';
import Provider, { interactionPolicy, type Configuration, type JWK, type KoaContextWithOIDC } from 'oidc-provider';
import { TypeOrmOidcAdapter } from './TypeOrmOidcAdapter.js';
import PlayerRepository from '../repositories/PlayerRepository.js';
import { renderError, successSource, userCodeConfirmSource, userCodeInputSource } from './oauthPages.js';
import logger from '../services/logger.js';
import { OAUTH_SCOPES } from '../../shared/app/oauth.js';

/**
 * Where oidc-provider endpoints are mounted (/oidc/auth, /oidc/token, ...)
 */
export const OIDC_PATH_PREFIX = '/oidc';

/**
 * Prefix of the Vue pages players see during OAuth flows.
 */
export const OAUTH_PAGES_PREFIX = '/oauth';

export const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

const getCookieKeys = (): string[] => {
    const { OIDC_COOKIE_KEYS } = process.env;

    if (OIDC_COOKIE_KEYS) {
        return OIDC_COOKIE_KEYS.split(',').map(s => s.trim()).filter(Boolean);
    }

    logger.warning('OIDC_COOKIE_KEYS not set, using a random key: OAuth flows in progress will break on restart. See .env.dist');

    return [crypto.randomBytes(32).toString('base64url')];
};

const getJwks = (): undefined | { keys: JWK[] } => {
    const { OIDC_JWKS } = process.env;

    if (!OIDC_JWKS) {
        logger.warning('OIDC_JWKS not set, using an ephemeral signing key: issued id_tokens can no longer be verified after a restart. Generate one with `pnpm hex oauth:generate-jwks`');

        return undefined;
    }

    return JSON.parse(OIDC_JWKS);
};

/**
 * Express session is shared with oidc-provider requests (same app, sessionMiddleware mounted before).
 */
const getPlayhexSessionPlayerId = (ctx: KoaContextWithOIDC): undefined | string => {
    return ctx.req.session?.playerId;
};

/**
 * Default policy, plus: prompt login again if the player logged in on PlayHex
 * is not the one oidc-provider remembers (logged out, switched account...),
 * so we never issue tokens for an account which is no longer the current one.
 */
const createInteractionPolicy = () => {
    const policy = interactionPolicy.base();

    policy.get('login')!.checks.add(new interactionPolicy.Check(
        'playhex_session_mismatch',
        'Current PlayHex player differs from the authenticated one',
        ctx => ctx.oidc.session?.accountId !== getPlayhexSessionPlayerId(ctx)
            ? interactionPolicy.Check.REQUEST_PROMPT
            : interactionPolicy.Check.NO_NEED_TO_PROMPT,
    ));

    return policy;
};

const createProvider = (): Provider => {
    const issuer = (process.env.BASE_URL ?? 'http://localhost:3000') + OIDC_PATH_PREFIX;

    const configuration: Configuration = {
        adapter: TypeOrmOidcAdapter,

        async findAccount(_ctx, publicId) {
            const player = await Container.get(PlayerRepository).getPlayer(publicId);

            if (player === null) {
                return undefined;
            }

            return {
                accountId: player.publicId,
                claims: () => ({
                    sub: player.publicId,
                    pseudo: player.pseudo,
                    slug: player.slug,
                    is_guest: player.isGuest,
                }),
            };
        },

        scopes: [...OAUTH_SCOPES],

        claims: {
            openid: ['sub'],
            read: ['pseudo', 'slug', 'is_guest'],
        },

        interactions: {
            url: (_ctx, interaction) => `${OAUTH_PAGES_PREFIX}/interaction/${interaction.uid}`,
            policy: createInteractionPolicy(),
        },

        features: {
            devInteractions: { enabled: false },
            deviceFlow: {
                enabled: true,
                userCodeInputSource,
                userCodeConfirmSource,
                successSource,
            },
            revocation: { enabled: true },
            introspection: { enabled: true },
            userinfo: { enabled: true },
            rpInitiatedLogout: { enabled: false },
        },

        // Authorization code only, no implicit nor hybrid flows
        responseTypes: ['code'],

        /*
         * Browser applications can call /oidc endpoints (token, refresh, revocation, userinfo)
         * from the origin of one of their redirect uris, nothing to configure per application.
         * Confidential clients must not expose their secret in a browser, so no CORS for them.
         * Api (/api) CORS is open to the same origins, see cors.ts.
         */
        clientBasedCORS(ctx, origin, client) {
            if (origin === 'null') {
                return false;
            }

            if (ctx.oidc.route !== 'userinfo' && client.clientAuthMethod !== 'none') {
                return false;
            }

            return (client.redirectUris ?? []).some(uri => URL.parse(uri)?.origin === origin);
        },

        // Tokens must not be revoked when player logs out of PlayHex or switches account in his browser.
        // Player revokes access from his connected applications settings.
        expiresWithSession: () => false,

        issueRefreshToken(_ctx, client, source) {
            if (!client.grantTypeAllowed('refresh_token')) {
                return false;
            }

            // Device flow is used by applications without browser, which cannot easily re-authorize
            return source.scopes.has('offline_access')
                || source.kind === 'DeviceCode'
            ;
        },

        ttl: {
            AccessToken: 3600,
            AuthorizationCode: 60,
            DeviceCode: 600,
            IdToken: 3600,
            Interaction: 3600,
            RefreshToken: 60 * 86400,
            Session: 14 * 86400,
            Grant: 365 * 86400,
        },

        cookies: {
            keys: getCookieKeys(),
        },

        jwks: getJwks(),

        renderError,

        routes: {
            authorization: '/auth',
            token: '/token',
            userinfo: '/me',
            revocation: '/token/revocation',
            introspection: '/token/introspection',
            device_authorization: '/device/auth',
            code_verification: '/device',
            jwks: '/jwks',
        },
    };

    const provider = new Provider(issuer, configuration);

    // Only trust X-Forwarded-* headers behind a reverse proxy, like express, see TRUST_PROXY.
    // Otherwise a client could spoof X-Forwarded-Host, which is used to build urls (discovery, device flow...)
    provider.proxy = Number(process.env.TRUST_PROXY ?? 0) > 0;

    provider.on('server_error', (_ctx, err) => {
        logger.error('oidc-provider server error', { errorMessage: err.message, stack: err.stack });
    });

    return provider;
};

let provider: null | Provider = null;

export const getOidcProvider = (): Provider => {
    if (provider === null) {
        provider = createProvider();
    }

    return provider;
};
