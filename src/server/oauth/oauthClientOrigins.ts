import { Container } from 'typedi';
import { Repository } from 'typeorm';
import { OAuthClient } from '../../shared/app/models/index.js';
import logger from '../services/logger.js';

/**
 * Applications are rarely added or disabled, and only manually.
 */
const CACHE_TTL = 60 * 1000;

let cache: null | { origins: Set<string>, expiresAt: number } = null;

const loadOrigins = async (): Promise<Set<string>> => {
    const clients = await Container.get<Repository<OAuthClient>>('Repository<OAuthClient>')
        .findBy({ enabled: true });

    const origins = new Set<string>();

    for (const client of clients) {
        for (const redirectUri of client.redirectUris) {
            const origin = URL.parse(redirectUri)?.origin;

            if (origin && origin !== 'null') {
                origins.add(origin);
            }
        }
    }

    return origins;
};

/**
 * Whether origin is the one of a redirect uri of an enabled OAuth application,
 * so its browser front can call the api with its access token.
 */
export const isOAuthClientOrigin = async (origin: string): Promise<boolean> => {
    if (cache === null || cache.expiresAt < Date.now()) {
        try {
            cache = { origins: await loadOrigins(), expiresAt: Date.now() + CACHE_TTL };
        } catch (e) {
            logger.error('Could not load OAuth clients origins', { errorMessage: (e as Error)?.message });

            return cache?.origins.has(origin) ?? false;
        }
    }

    return cache.origins.has(origin);
};
