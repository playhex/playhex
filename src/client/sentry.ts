import * as Sentry from '@sentry/browser';

/* global SENTRY_DSN */
// @ts-ignore: SENTRY_DSN replaced at build time by webpack.
const dsn: null | string = SENTRY_DSN;

dsn && Sentry.init({
    dsn,
    integrations: [
        new Sentry.BrowserTracing({
            tracePropagationTargets: [
                'localhost',
                /^https:\/\/hex.alcalyn.app/,
            ],
        }),
        new Sentry.Replay({
            maskAllText: false,
            blockAllMedia: false,
        }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});
