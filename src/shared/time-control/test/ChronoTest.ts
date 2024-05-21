import { describe, it } from 'mocha';
import { Chrono } from '../Chrono';
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

        const isElapsedNow = chrono.isElapsedAt(now);
        const isElapsedFewMomentLater = chrono.isElapsedAt(aFewMomentLater);

        assert.strictEqual(isElapsedNow, null, 'Not expected to have elapsed now');
        assert.notStrictEqual(isElapsedFewMomentLater, null, 'Expected to have elapsed when checking a few moment later');
        assert.strictEqual(isElapsedFewMomentLater!.getTime() - run10SecondsEarlier.getTime(), 30000, 'Expected to have elapsed 30 seconds after started');
    });
});
