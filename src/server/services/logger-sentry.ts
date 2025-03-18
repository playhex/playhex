import { Logger } from 'winston';
import Sentry, { SentryTransportOptions } from 'winston-transport-sentry-node';

const {
    SENTRY_SERVER_DSN,
    SENTRY_SERVER_LOG_LEVEL,
    SENTRY_SERVER_NAME,
    SENTRY_SERVER_SAMPLE_RATE,
} = process.env;

export const addSentryLoggerIfConfigured = (logger: Logger): void => {
    if (!SENTRY_SERVER_DSN) {
        return;
    }

    const options: SentryTransportOptions = {
        sentry: {
            dsn: SENTRY_SERVER_DSN,
            serverName: SENTRY_SERVER_NAME ?? 'hex-server',
            sampleRate: SENTRY_SERVER_SAMPLE_RATE
                ? parseFloat(SENTRY_SERVER_SAMPLE_RATE)
                : 1.0
            ,
        },
        level: SENTRY_SERVER_LOG_LEVEL ?? 'warning',
        handleExceptions: true,
    };

    logger.add(new Sentry.default(options));
};
