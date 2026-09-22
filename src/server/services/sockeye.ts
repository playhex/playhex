import { timingSafeEqual } from 'node:crypto';
import { sockeye } from '@sockeye-js/collect-socketio';
import { createMemoryStore } from '@sockeye-js/store-memory';
import { createRedisStore, RedisLike } from '@sockeye-js/store-redis';
import { dashboard } from '@sockeye-js/ui';
import { Express, NextFunction, Request, Response } from 'express';
import { Redis } from 'ioredis';
import { Server } from 'socket.io';
import logger from './logger.js';

const constantTimeEquals = (a: string, b: string): boolean => {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
};

/**
 * Basic auth on the sockeye dashboard, credentials from SOCKEYE_USER and SOCKEYE_PASS.
 */
const basicAuth = (username: string, password: string) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const header = req.headers.authorization ?? '';
        const [scheme, encoded] = header.split(' ');

        if (scheme === 'Basic' && encoded) {
            const decoded = Buffer.from(encoded, 'base64').toString();
            const separator = decoded.indexOf(':');

            if (
                separator > -1
                && constantTimeEquals(decoded.slice(0, separator), username)
                && constantTimeEquals(decoded.slice(separator + 1), password)
            ) {
                next();
                return;
            }
        }

        res.set('WWW-Authenticate', 'Basic realm="sockeye", charset="UTF-8"');
        res.status(401).send('Authentication required.');
    };

/**
 * Monitor websocket traffic, dashboard served on /sockeye.
 * Enable it with SOCKEYE_ENABLED=true in .env.
 * Metrics are kept in Redis when REDIS_URL is set, so they survive a restart and are shared by
 * every app instance, and in memory otherwise.
 */
const initSockeye = (app: Express, io: Server): void => {
    if (process.env.SOCKEYE_ENABLED !== 'true') {
        return;
    }

    const {
        SOCKEYE_USER: username,
        SOCKEYE_PASS: password,
    } = process.env;

    if (!username || !password) {
        throw new Error('SOCKEYE_USER and SOCKEYE_PASS must both be set to serve the sockeye dashboard.');
    }

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
    app.use('/sockeye', basicAuth(username, password), dashboard(store));
};

export default initSockeye;
