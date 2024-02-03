import assert from 'assert';
import { describe, it } from 'mocha';
import { ByoYomiTimeControl } from '../time-controls/ByoYomiTimeControl';
import { ByoYomiChrono } from '../ByoYomiChrono';
import { timeValueToSeconds } from '../TimeValue';

const nowDiff = (seconds: number) => new Date(new Date().getTime() + seconds * 1000);

describe('ByoYomi', () => {
    it('can recreate ByoYomi Chrono from values, and consume periods if needed', () => {
        const chrono = new ByoYomiChrono(10, 10, 10);

        // Set 8 periods, but chrono elapsed for 45 seconds
        chrono.setValues(nowDiff(-45.5), 8);

        assert.strictEqual(chrono.getRemainingPeriods(), 3);
        assert.match(chrono.toString(), /^4\.\d+s \+ 3 x 10s$/);

        // Set 8 periods, but chrono elapsed for 100 seconds
        chrono.setValues(nowDiff(-100), 8);

        assert.strictEqual(chrono.getRemainingPeriods(), 0);
        assert.match(chrono.toString(), /^-[\d.]+s \+ 0 x 10s$/);
    });

    it('can recreate ByoYomi TimeControl from values, and consume periods if needed', () => {
        const timeControl = new ByoYomiTimeControl({
            initialSeconds: 10,
            periodsCount: 10,
            periodSeconds: 10,
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
                    remainingMainTime: 5,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        });

        let values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 3);
        assert.strictEqual(Math.floor(timeValueToSeconds(values.players[0].remainingMainTime)), 4);
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
                    remainingMainTime: 5,
                    remainingPeriods: 5,
                    totalRemainingTime: 12345,
                },
            ],
        });

        values = timeControl.getValues();

        assert.strictEqual(values.players[0].remainingPeriods, 0);
        assert.strictEqual(values.players[0].remainingMainTime, 0);
        assert.ok(timeControl.getState() === 'elapsed');
    });
});
