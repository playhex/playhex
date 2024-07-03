import winston, { Logger } from 'winston';
import LokiTransport from 'winston-loki';

type SyslogLevels =
    'debug'
    | 'info'
    | 'notice'
    | 'warning'
    | 'error'
    | 'crit'
    | 'alert'
    | 'emerg'
;

/**
 * Which log level to use?
 *
 *      emerg    application is about to shutdown
 *      alert    application cannot continue in this state
 *      crit     application try to continue but not normally
 *
 *      error    unwanted, process failed, try to continue but not normally. Application still safe.
 *      warning  unwanted, something to fix to make it better, but process can continue
 *      notice   state ok but to notice
 *
 *      info     normal state
 *      debug    for developers only
 *
 * Terminology:
 *
 *      a process:   handling a single player or game, not impacting other players or games
 *      application: the whole server, players and games
 *
 * See https://en.wikipedia.org/wiki/Syslog for base interpretation.
 */
const logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    transports: [
        new winston.transports.Console({
            handleExceptions: true,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

const { LOKI_HOST, LOKI_USER, LOKI_TOKEN, LOKI_SERVICE_NAME, LOKI_LOG_LEVEL } = process.env;

if (LOKI_HOST) {
    const basicAuth = LOKI_USER && LOKI_TOKEN
        ? `${LOKI_USER}:${LOKI_TOKEN}`
        : undefined
    ;

    logger.add(new LokiTransport({
        host: LOKI_HOST,
        basicAuth,
        labels: { service_name: LOKI_SERVICE_NAME },
        level: LOKI_LOG_LEVEL,
        handleExceptions: true,
        batching: false,
        onConnectionError(error) {
            // eslint-disable-next-line no-console
            console.error('loki transport connect error', error);
        },
    }));
}

export default logger as Pick<Logger, SyslogLevels>;
