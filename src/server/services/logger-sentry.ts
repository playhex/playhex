import * as Sentry from '@sentry/node';
import { Logger } from 'winston';
import TransportStream from 'winston-transport';

const {
    SENTRY_ENVIRONMENT,
    SENTRY_SERVER_DSN,
    SENTRY_SERVER_LOG_LEVEL,
    SENTRY_SERVER_NAME,
    SENTRY_SERVER_SAMPLE_RATE,
    NODE_ENV,
} = process.env;

const sentryLevels: { [syslogLevel: string]: Sentry.SeverityLevel } = {
    debug: 'debug',
    info: 'info',
    notice: 'info',
    warning: 'warning',
    error: 'error',
    crit: 'fatal',
    alert: 'fatal',
    emerg: 'fatal',
};

type LogInfo = {
    level: string;
    message: string;
    name?: string;
    stack?: string;
    [key: string]: unknown;
};

const toError = (info: LogInfo): Error => {
    const error = Object.values(info).find(value => value instanceof Error);

    if (error) {
        return error;
    }

    const created = new Error(info.message);

    created.name = info.name ?? 'Error';
    created.stack = info.stack ?? created.stack;

    return created;
};

/**
 * Sends logs to Sentry. Sentry.init() must be called before.
 *
 * log() must never throw and always call next():
 * otherwise this stream never drains, and after a few logs
 * the whole logger is paused, including the console transport.
 */
export class SentryTransport extends TransportStream {
    override log(info: LogInfo, next: () => void): void {
        try {
            const { message, ...extras } = info;
            const level = sentryLevels[info.level] ?? 'error';

            Sentry.withScope(scope => {
                scope.setExtras(extras);

                if (level === 'error' || level === 'fatal') {
                    Sentry.captureException(toError(info), { level });
                } else {
                    Sentry.captureMessage(message, level);
                }
            });
        } catch (e) {
            // Not using logger here to prevent infinite loop
            // eslint-disable-next-line no-console
            console.error('Could not send log to Sentry', e);
        }

        next();
    }
}

export const addSentryLoggerIfConfigured = (logger: Logger): void => {
    if (!SENTRY_SERVER_DSN) {
        return;
    }

    Sentry.init({
        dsn: SENTRY_SERVER_DSN,
        serverName: SENTRY_SERVER_NAME ?? 'hex-server',
        environment: SENTRY_ENVIRONMENT || NODE_ENV || 'production',
        sampleRate: SENTRY_SERVER_SAMPLE_RATE
            ? parseFloat(SENTRY_SERVER_SAMPLE_RATE)
            : 1.0
        ,
    });

    logger.add(new SentryTransport({
        level: SENTRY_SERVER_LOG_LEVEL ?? 'warning',
        handleExceptions: true,
    }));
};
