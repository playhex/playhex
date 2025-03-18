import assert from 'assert';
import { describe, it } from 'mocha';
import { ByoYomiChrono } from '../ByoYomiChrono.js';
import { dateDiff } from './utils.js';

describe('ByoYomiChrono', () => {
    it('can recreate ByoYomi Chrono from values, and consume periods if needed', () => {
        const chrono = new ByoYomiChrono(10000, 10000, 10);
        const now = new Date();

        // Set 8 periods, but chrono elapsed for 45 seconds
        chrono.setValues(dateDiff(now, -45000), 8, now);

        assert.strictEqual(chrono.getRemainingPeriods(), 3);
        assert.strictEqual(chrono.toString(now), '5000ms + 3 x 10000ms (elapsing)');

        // Set 8 periods, but chrono elapsed for 100 seconds
        chrono.setValues(dateDiff(now, -100000), 8, now);

        assert.strictEqual(chrono.getRemainingPeriods(), 0);
        assert.strictEqual(chrono.toString(now), '0ms + 0 x 10000ms (paused)');
    });

    it('consumes multiple periods if needed when calling pause(date)', () => {
        const t0 = new Date('2024-01-01T00:00:00.000Z');
        const pauseAfter22seconds = dateDiff(t0, 22000);

        const chrono = new ByoYomiChrono(10000, 5000, 5);

        chrono.run(t0, null);
        chrono.pause(pauseAfter22seconds);

        assert.strictEqual(chrono.getRemainingPeriods(), 2);
        assert.strictEqual(chrono.toString(pauseAfter22seconds), '3000ms + 2 x 5000ms (paused)');
        assert.strictEqual(chrono.toString(new Date()), '3000ms + 2 x 5000ms (paused)', 'Because paused, should be same displaying no matter given date');
    });

    it('consumes multiple periods if needed when calling pauseByMovePlayed(date), and reload', () => {
        const t0 = new Date('2024-01-01T00:00:00.000Z');
        const pauseAfter22seconds = dateDiff(t0, 22000);

        const chrono = new ByoYomiChrono(10000, 5000, 5);

        chrono.run(t0, null);
        chrono.pauseByMovePlayed(pauseAfter22seconds);

        assert.strictEqual(chrono.getRemainingPeriods(), 2);
        assert.strictEqual(chrono.toString(pauseAfter22seconds), '5000ms + 2 x 5000ms (paused)');
        assert.strictEqual(chrono.toString(new Date()), '5000ms + 2 x 5000ms (paused)', 'Because paused, should be same displaying no matter given date');
    });

    it('consumes all periods and elapses if paused very lately', () => {
        const t0 = new Date('2024-01-01T00:00:00.000Z');
        const pauseAfter40seconds = dateDiff(t0, 40000);
        let elapsedAt: null | Date = null;

        const chrono = new ByoYomiChrono(10000, 5000, 5);

        chrono.on('elapsed', date => elapsedAt = date);

        chrono.run(t0, null);
        chrono.pauseByMovePlayed(pauseAfter40seconds);

        // Should have elapsed at t+35s
        assert.notStrictEqual(elapsedAt, null);
        assert.strictEqual((elapsedAt as unknown as Date).toISOString(), dateDiff(t0, 35000).toISOString());

        assert.strictEqual(chrono.getRemainingPeriods(), 0);
        assert.strictEqual(chrono.toString(pauseAfter40seconds), '0ms + 0 x 5000ms (paused)');
        assert.strictEqual(chrono.toString(new Date()), '0ms + 0 x 5000ms (paused)', 'Because paused, should be same displaying no matter given date');
    });
});
