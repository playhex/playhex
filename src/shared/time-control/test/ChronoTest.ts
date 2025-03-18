import { describe, it } from 'mocha';
import { Chrono } from '../Chrono.js';
import assert from 'assert';

describe('Chrono', () => {
    it('elapses at expected time', () => {
        const runAt = new Date('2024-01-01 00:00:00');
        let elapsedAt: null | Date = null;

        const chrono = new Chrono(30000);

        chrono.on('elapsed', date => elapsedAt = date);
        chrono.run(runAt);

        assert.notStrictEqual(elapsedAt, null, '"elapsed" event has not been emitted');
        assert.strictEqual(elapsedAt!.getTime(), new Date('2024-01-01 00:00:30').getTime());
    });

    it('run at given timestamp', () => {
        const now = new Date();
        const run10SecondsEarlier = new Date(now.getTime() - 10000);

        const chrono = new Chrono(30000);

        chrono.run(run10SecondsEarlier);
        chrono.pause(now);

        assert.strictEqual(chrono.getValue(), 20000);
    });

    it('isElapsed uses strict timestamp', () => {
        const now = new Date();
        const run10SecondsEarlier = new Date(now.getTime() - 10000);
        const aFewMomentLater = new Date(now.getTime() + 60000);

        const chrono = new Chrono(30000);
        chrono.run(run10SecondsEarlier);

        const isElapsedNow = chrono.getElapsedAt(now);
        const isElapsedFewMomentLater = chrono.getElapsedAt(aFewMomentLater);

        assert.strictEqual(isElapsedNow, null, 'Not expected to have elapsed now');
        assert.notStrictEqual(isElapsedFewMomentLater, null, 'Expected to have elapsed when checking a few moment later');
        assert.strictEqual(isElapsedFewMomentLater!.getTime() - run10SecondsEarlier.getTime(), 30000, 'Expected to have elapsed 30 seconds after started');
    });

    it('does not elapses when specified and using past dates', () => {
        const t0 = new Date('2024-01-01T00:00:00.000Z');
        const chrono = new Chrono(30000);
        let elapsedAt: null | Date = null;

        chrono.on('elapsed', date => elapsedAt = date);

        chrono.run(t0, null);

        assert.strictEqual(elapsedAt, null);
    });

    it('elapses at expected moment when using past dates', () => {
        const t0 = new Date('2024-01-01T00:00:00.000Z');
        const t20 = new Date(t0.getTime() + 20000);
        const t40 = new Date(t0.getTime() + 40000);
        const t60 = new Date(t0.getTime() + 60000);
        const chrono = new Chrono(30000);
        let elapsedAt: null | Date = null;

        chrono.on('elapsed', date => elapsedAt = date);

        chrono.run(t0, null);
        chrono.pause(t20); // pausing at 10s
        chrono.run(t40, null); // running again, 10s, no auto elapse

        assert.strictEqual(elapsedAt, null);

        // pause 10s after chrono should have elapsed, should emit elapsed event
        chrono.pause(t60);

        // Chrono had 30s, paused for 20s so expected to elapse at t=50s
        assert.strictEqual((elapsedAt as unknown as Date).toISOString(), '2024-01-01T00:00:50.000Z');
    });
});
