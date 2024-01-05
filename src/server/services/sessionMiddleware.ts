import session from 'express-session';

const { SESSION_SECRET, SESSION_HTTPS_ONLY } = process.env;

if (!SESSION_SECRET || undefined === SESSION_HTTPS_ONLY) {
    throw new Error('Missing SESSION_SECRET or SESSION_HTTPS_ONLY in .env');
}

export const sessionMiddleware = session({
    secret: SESSION_SECRET.split(','),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 365 * 86400 * 1000,
        secure: 'true' === SESSION_HTTPS_ONLY,
    },
});



