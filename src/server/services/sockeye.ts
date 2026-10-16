import { sockeye } from '@sockeye-js/collect-socketio';
import { createMemoryStore } from '@sockeye-js/store-memory';
import { createRedisStore, RedisLike } from '@sockeye-js/store-redis';
import { dashboard } from '@sockeye-js/ui';
import { Express } from 'express';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import logger from './logger.js';
import { adminUiBasicAuth, requireAdminUiCredentials } from './security/adminUiBasicAuth.js';

export const SOCKEYE_PATH = '/admin/sockeye';

/**
 * Monitor websocket traffic, dashboard served on /admin/sockeye.
 * Enable it with SOCKEYE_ENABLED=true in .env.
 * Metrics are kept in Redis when REDIS_URL is set, so they survive a restart and are shared by
 * every app instance, and in memory otherwise.
 */
const initSockeye = (app: Express, io: Server): void => {
    if (process.env.SOCKEYE_ENABLED !== 'true') {
        return;
    }

    requireAdminUiCredentials('sockeye dashboard');

    const { REDIS_URL, REDIS_PREFIX } = process.env;

    const store = REDIS_URL
        // ioredis 6 types reject numeric `stop` in zrange, but runtime behaviour is unchanged
        ? createRedisStore(new Redis(REDIS_URL) as unknown as RedisLike, {
            prefix: (REDIS_PREFIX ?? 'hex') + '-sockeye',
            onError: error => logger.warning('sockeye could not flush its metrics to Redis', { error }),
        })
        : createMemoryStore()
    ;

    io.use(sockeye(store));
    app.use(SOCKEYE_PATH, adminUiBasicAuth, dashboard(store));
};

export default initSockeye;
