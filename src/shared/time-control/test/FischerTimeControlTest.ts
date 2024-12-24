import { describe, it } from 'mocha';
import assert from 'assert';
import { FischerTimeControl } from '../time-controls/FischerTimeControl';
import { dateDiff } from './utils';

describe('FischerTimeControl', () => {
    it('elapses instantly at expected date, when started at past date', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new FischerTimeControl({
            initialTime: 10000,
            maxTime: 10000,
            timeIncrement: 10000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Started 20 seconds earlier, so now it has elapsed
        timeControl.start(dateDiff(now, -20000));

        // Should have elapsed 10 seconds earlier
        assert.notStrictEqual(elapsedAt, null);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).date.toISOString(), dateDiff(now, -10000).toISOString());
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).playerLostByTime, 0);
        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
        assert.strictEqual(timeControl.getStrictElapsedAt().toISOString(), dateDiff(now, -10000).toISOString());
    });

    it('can be recreated without elapsing because of time increment', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new FischerTimeControl({
            initialTime: 10000,
            maxTime: 10000,
            timeIncrement: 10000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Game started 30 seconds earlier
        const startedAt = dateDiff(now, -30000);
        timeControl.start(startedAt, null);
        assert.strictEqual(elapsedAt, null);

        // Players both take 5 seconds to play, so clocks always increment to 10s and should not elapse.
        timeControl.push(0, dateDiff(startedAt, 5000), null);
        timeControl.push(1, dateDiff(startedAt, 10000), null);
        timeControl.push(0, dateDiff(startedAt, 15000), null);
        timeControl.push(1, dateDiff(startedAt, 20000), null);
        timeControl.push(0, dateDiff(startedAt, 25000)); // Last push was 5 seconds earlier, should not elapse

        // Fischer (running): 10000ms (paused) | 5000ms (elapsing)
        assert.strictEqual(elapsedAt, null);
        assert.strictEqual(timeControl.toString(now), 'Fischer (running): 10000ms (paused) | 5000ms (elapsing)');
    });

    it('elapses while recreating if a player run out of time', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10 seconds per turn
        const timeControl = new FischerTimeControl({
            initialTime: 10000,
            maxTime: 10000,
            timeIncrement: 10000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Game started 30 seconds earlier
        const startedAt = dateDiff(now, -30000);
        timeControl.start(startedAt, null);
        assert.strictEqual(elapsedAt, null);

        // Players both take 5 seconds to play, so clocks always increment to 10s and should not elapse.
        timeControl.push(0, dateDiff(startedAt, 5000), null);
        timeControl.push(1, dateDiff(startedAt, 10000), null);
        timeControl.push(0, dateDiff(startedAt, 25000), null); // Player took 15s to move, but had 10s

        // So player 0 should have elapsed at startedAt + 20s
        assert.notStrictEqual(elapsedAt, null);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).playerLostByTime, 0);
        assert.strictEqual((elapsedAt as unknown as { playerLostByTime: number, date: Date }).date.toISOString(), dateDiff(startedAt, 20000).toISOString());
        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
        assert.strictEqual(timeControl.getStrictElapsedAt().toISOString(), dateDiff(startedAt, 20000).toISOString());
        assert.strictEqual(timeControl.toString(now), 'Fischer (elapsed): 0ms (paused) | 10000ms (paused)');
    });

    it('can increment more than initial time in case of uncapped Fischer', () => {
        const now = new Date();
        let elapsedAt: null | { playerLostByTime: number, date: Date } = null;

        // 10s + 2s, uncapped
        const timeControl = new FischerTimeControl({
            initialTime: 10000,
            timeIncrement: 2000,
        });

        timeControl.on('elapsed', (playerLostByTime, date) => elapsedAt = { playerLostByTime, date });

        // Game started 30 seconds earlier
        timeControl.start(now, null);
        assert.strictEqual(elapsedAt, null);

        // First player plays instantly, he now have 10-0+2 = 12s
        timeControl.push(0, now, null);
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime, 12000);

        // Second player takes 1s to play, he now have 10-1+2 = 11s
        timeControl.push(1, dateDiff(now, 1000), null);
        assert.strictEqual(timeControl.getValues().players[1].totalRemainingTime, 11000);

        // First player takes 3s, he now have 12-3+2 = 11s
        timeControl.push(0, dateDiff(now, 4000), null);
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime, 11000);
    });
});
