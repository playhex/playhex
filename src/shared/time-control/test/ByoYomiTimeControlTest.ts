import { describe, it } from 'mocha';
import assert from 'assert';
import { ByoYomiTimeControl } from '../time-controls/ByoYomiTimeControl';
import { timeValueToMilliseconds } from '../TimeValue';
import { dateDiff } from './utils';

describe('ByoYomiTimeControl', () => {
    it('elapses instantly at expected date, when started at past date', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new ByoYomiTimeControl({
            initialTime: 10000,
            periodsCount: 5,
            periodTime: 5000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Started 40 seconds earlier, so now it has elapsed
        timeControl.start(dateDiff(now, -40000));

        // Should have elapsed 5 seconds earlier
        assert.notStrictEqual(elapsedAt, null);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).date.toISOString(), dateDiff(now, -5000).toISOString());
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).playerLostByTime, 0);
        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
        assert.strictEqual(timeControl.getStrictElapsedAt().toISOString(), dateDiff(now, -5000).toISOString());
    });

    it('can be recreated without elapsing because of time increment', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new ByoYomiTimeControl({
            initialTime: 10000,
            periodsCount: 5,
            periodTime: 5000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Game started 60 seconds earlier
        const startedAt = dateDiff(now, -60000);
        timeControl.start(startedAt, null);
        assert.strictEqual(elapsedAt, null);

        let t = startedAt;
        const tAdd = (ms: number) => t = dateDiff(t, ms);

        // Players have played, consuming periods but never elapsing
        timeControl.push(0, tAdd(5000), null);
        timeControl.push(1, tAdd(5000), null); // Both players have consumed 5s on main time, no periods
        timeControl.push(0, tAdd(12000), null); // p0 consumes 2 periods, 3 remaining
        timeControl.push(1, tAdd(17000), null); // p1 consumes 3 periods, 2 remaining
        timeControl.push(0, tAdd(19000)); // p0 now have 0 periods

        assert.strictEqual(elapsedAt, null);
        // Total = 58s, 2 seconds are elapsing to now, so p1 uses 2s on its current period time
        assert.strictEqual(timeControl.toString(now), 'ByoYomi (running): 5000ms + 0 x 5000ms (paused) | 3000ms + 2 x 5000ms (elapsing)');
    });

    it('elapses while recreating if a player run out of time', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new ByoYomiTimeControl({
            initialTime: 10000,
            periodsCount: 5,
            periodTime: 5000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Game started 60 seconds earlier
        const startedAt = dateDiff(now, -60000);
        timeControl.start(startedAt, null);
        assert.strictEqual(elapsedAt, null);

        let t = startedAt;
        const tAdd = (ms: number) => t = dateDiff(t, ms);

        // Players have played, consuming periods but never elapsing
        timeControl.push(0, tAdd(5000), null);
        timeControl.push(1, tAdd(5000), null); // Both players have consumed 5s on main time, no periods
        timeControl.push(0, tAdd(31000), null); // p0 elapses because pushed 1s after elapse date

        // So player 0 should have elapsed at startedAt+5+5+30s
        assert.notStrictEqual(elapsedAt, null);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).playerLostByTime, 0);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).date.toISOString(), dateDiff(startedAt, 40000).toISOString());
        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
        assert.strictEqual(timeControl.getStrictElapsedAt().toISOString(), dateDiff(startedAt, 40000).toISOString());
        assert.strictEqual(timeControl.toString(now), 'ByoYomi (elapsed): 0ms + 0 x 5000ms (paused) | 5000ms + 5 x 5000ms (paused)');
    });

    it('can recreate ByoYomi TimeControl from values, and consume periods if needed', () => {
        const now = new Date();
        const timeControl = new ByoYomiTimeControl({
            initialTime: 10000,
            periodsCount: 10,
            periodTime: 10000,
        });

        // Set 8 periods, but chrono elapsed for 45 seconds
        timeControl.setValues({
            currentPlayer: 0,
            state: 'running',
            players: [
                {
                    remainingMainTime: dateDiff(now, -45500),
                    remainingPeriods: 8,
                    totalRemainingTime: 12345,
                },
                {
                    remainingMainTime: 5000,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        }, now);

        let values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 3);
        assert.strictEqual(Math.floor(timeValueToMilliseconds(values.players[0].remainingMainTime, now) / 1000), 4);
        assert.ok(timeControl.getState() === 'running');

        // Set 8 periods, but chrono elapsed for 100 seconds
        timeControl.setValues({
            currentPlayer: 0,
            state: 'running',
            players: [
                {
                    remainingMainTime: dateDiff(now, -100000),
                    remainingPeriods: 8,
                    totalRemainingTime: 12345,
                },
                {
                    remainingMainTime: 5000,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        }, now);

        values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 0);
        assert.strictEqual(values.players[0].remainingMainTime, 0);
        assert.ok(timeControl.getState() === 'elapsed');
        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
    });
});
