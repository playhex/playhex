import assert from 'assert';
import { Writable } from 'stream';
import * as Sentry from '@sentry/node';
import { after, before, beforeEach, describe, it } from 'mocha';
import winston from 'winston';
import { SentryTransport } from '../services/logger-sentry.js';

describe('SentryTransport', () => {
    const events: Sentry.ErrorEvent[] = [];
    let consoleLines: string[] = [];

    const createLogger = () => winston.createLogger({
        levels: winston.config.syslog.levels,
        level: 'info',
        format: winston.format.json(),
        transports: [
            new winston.transports.Stream({
                stream: new Writable({
                    write(chunk, _, next) {
                        consoleLines.push(String(chunk));
                        next();
                    },
                }),
            }),
            new SentryTransport({ level: 'warning' }),
        ],
    });

    before(() => {
        Sentry.init({
            dsn: 'https://key@127.0.0.1/1',
            defaultIntegrations: false,
            beforeSend: event => {
                events.push(event);
                return null;
            },
        });
    });

    after(() => Sentry.close());

    beforeEach(() => {
        events.length = 0;
        consoleLines = [];
    });

    it('keeps logging to other transports after a log sent to Sentry', () => {
        const logger = createLogger();

        logger.warning('A warning');

        for (let i = 0; i < 100; ++i) {
            logger.info(`Info ${i}`);
        }

        assert.strictEqual(consoleLines.length, 101);
    });

    it('sends warnings as messages, with metadata', () => {
        createLogger().warning('A warning', { gameId: 'abc' });

        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].message, 'A warning');
        assert.strictEqual(events[0].level, 'warning');
        assert.strictEqual(events[0].extra?.gameId, 'abc');
    });

    it('sends errors as exceptions', () => {
        createLogger().error('An error');

        assert.strictEqual(events.length, 1);
        assert.strictEqual(events[0].level, 'error');
        assert.strictEqual(events[0].exception?.values?.[0].value, 'An error');
    });

    it('does not send logs below transport level', () => {
        createLogger().info('An info');

        assert.strictEqual(events.length, 0);
    });

    it('does not leak metadata to next logs', () => {
        const logger = createLogger();

        logger.warning('First', { gameId: 'abc' });
        logger.warning('Second');

        assert.strictEqual(events[1].extra?.gameId, undefined);
    });
});
