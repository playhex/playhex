import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import type { RequestHandler } from 'express';

const { SESSION_SECRET, SESSION_HTTPS_ONLY } = process.env;

if (!SESSION_SECRET || undefined === SESSION_HTTPS_ONLY) {
    throw new Error('Missing SESSION_SECRET or SESSION_HTTPS_ONLY in .env');
}

const sessionOptions: session.SessionOptions = {
    secret: SESSION_SECRET.split(','),
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
        maxAge: 365 * 86400 * 1000,
        secure: 'true' === SESSION_HTTPS_ONLY,
    },
};

const { REDIS_URL, REDIS_PREFIX } = process.env;

if (REDIS_URL) {
    const redisClient = createClient({
        url: REDIS_URL,
    });

    redisClient.connect();

    sessionOptions.store = new RedisStore({
        client: redisClient,
        prefix: (REDIS_PREFIX ?? 'hex') + '-session:',
    });
}

export const sessionMiddleware: RequestHandler = session(sessionOptions);
