import assert from 'assert';
import { describe, it } from 'mocha';
import { ByoYomiTimeControl } from '../time-controls/ByoYomiTimeControl';
import { ByoYomiChrono } from '../ByoYomiChrono';
import { timeValueToMilliseconds } from '../TimeValue';

const nowDiff = (seconds: number) => new Date(new Date().getTime() + seconds * 1000);

describe('ByoYomi', () => {
    it('can recreate ByoYomi Chrono from values, and consume periods if needed', () => {
        const chrono = new ByoYomiChrono(10000, 10000, 10);
        const now = new Date();

        // Set 8 periods, but chrono elapsed for 45 seconds
        chrono.setValues(nowDiff(-45.5), 8, now);

        assert.strictEqual(chrono.getRemainingPeriods(), 3);
        assert.match(chrono.toString(now), /^4\.\d+s \+ 3 x 10s$/);

        // Set 8 periods, but chrono elapsed for 100 seconds
        chrono.setValues(nowDiff(-100), 8, now);

        assert.strictEqual(chrono.getRemainingPeriods(), 0);
        assert.match(chrono.toString(now), /^-[\d.]+s \+ 0 x 10s$/);
    });

    it('can recreate ByoYomi TimeControl from values, and consume periods if needed', () => {
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
                    remainingMainTime: nowDiff(-45.5),
                    remainingPeriods: 8,
                    totalRemainingTime: 12345,
                },
                {
                    remainingMainTime: 5000,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        }, new Date());

        let values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 3);
        assert.strictEqual(Math.floor(timeValueToMilliseconds(values.players[0].remainingMainTime, new Date()) / 1000), 4);
        assert.ok(timeControl.getState() === 'running');

        // Set 8 periods, but chrono elapsed for 100 seconds
        timeControl.setValues({
            currentPlayer: 0,
            state: 'running',
            players: [
                {
                    remainingMainTime: nowDiff(-100),
                    remainingPeriods: 8,
                    totalRemainingTime: 12345,
                },
                {
                    remainingMainTime: 5000,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        }, new Date());

        values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 0);
        assert.strictEqual(values.players[0].remainingMainTime, 0);
        assert.ok(timeControl.getState() === 'elapsed');
    });
});
