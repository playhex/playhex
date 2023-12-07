import winston, { Logger } from 'winston';

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
 *      a process:   handling a single user or game, not impacting other players or games
 *      application: the whole server, players and games
 *
 * See https://en.wikipedia.org/wiki/Syslog for base interpretation.
 */
const logger: Pick<Logger, SyslogLevels> = winston.createLogger({
    levels: winston.config.syslog.levels,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
            ),
        }),
    ],
});

export default logger;
