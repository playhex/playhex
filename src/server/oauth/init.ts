import { purgeExpiredOAuthPayloads } from './TypeOrmOidcAdapter.js';
import logger from '../services/logger.js';

const PURGE_EVERY = 3600 * 1000;

/**
 * Periodically remove expired OAuth tokens, codes, sessions...
 */
export const initOAuth = (): void => {
    setInterval(async () => {
        try {
            const deleted = await purgeExpiredOAuthPayloads();

            if (deleted > 0) {
                logger.info(`Purged ${deleted} expired OAuth payloads`);
            }
        } catch (e) {
            logger.error('Could not purge expired OAuth payloads', { errorMessage: (e as Error)?.message });
        }
    }, PURGE_EVERY).unref();
};
