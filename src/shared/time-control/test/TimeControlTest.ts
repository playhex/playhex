import assert from 'assert';
import { it } from 'mocha';
import { TimeControlError } from '../TimeControl';
import { AbsoluteTimeControl } from '../time-controls/AbsoluteTimeControl';
import { FischerTimeControl } from '../time-controls/FischerTimeControl';
import { SimpleTimeControl } from '../time-controls/SimpleTimeControl';
import TimeValue, { timeValueToSeconds } from '../TimeValue';
import { ByoYomiTimeControl } from '../time-controls/ByoYomiTimeControl';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parallel = require('mocha.parallel');

const wait = async (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

/**
 * Asserts whether time is equals with some milliseconds tolerance.
 *
 * assertTimeEquals(0.205, 0.2) asserts true
 * assertTimeEquals(0.304, 0.2) asserts false
 * assertTimeEquals(new Date(...), 0.2) asserts if remaining time is almost same
 */
const assertTimeEquals = (timeValue: TimeValue, time: number): void => {
    if (timeValue instanceof Date) {
        timeValue = timeValueToSeconds(timeValue);
    }

    const diff = Math.abs(timeValue - time);

    assert.strictEqual(diff < 0.020, true);
};

/**
 * All time controls are tested in a single file to run them all in parallel.
 * All single test should last less than one second. Use a granularity of 100ms.
 */
parallel('AbsoluteTimeControl', () => {

    /**
     * AbsoluteTimeControl
     */

    it('[AbsoluteTimeControl] should display exactly 0/paused after time elapsed', async function (done) {
        this.timeout(1000);

        const timeControl = new AbsoluteTimeControl({ secondsPerPlayer: 0.1 });

        // 1s | 1s
        timeControl.start();

        await wait(0.2);

        // elapsed | 1s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(0, timeControl.getValues().players[0].totalRemainingTime);

        done();
    });


    it('[AbsoluteTimeControl] elapses on first player', async function (done) {
        this.timeout(1000);

        const timeControl = new AbsoluteTimeControl({ secondsPerPlayer: 0.5 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 5s | 5s
        timeControl.start();

        await wait(0.4);

        // 1s | 5s, still running
        assert.strictEqual(elapsedEvent, null);
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.2);

        // elapsed | 5s
        assert.strictEqual(elapsedEvent, 0);
        assert.strictEqual(timeControl.getState(), 'elapsed');

        done();
    });


    it('[AbsoluteTimeControl] elapses on second player', async function (done) {
        this.timeout(1000);

        const timeControl = new AbsoluteTimeControl({ secondsPerPlayer: 0.3 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.2);

        // 1s | 3s, player 0 pushes
        timeControl.push(0);

        await wait(0.2);

        // 1s | 1s, still running, current player 1
        assert.strictEqual(elapsedEvent, null);
        assert.strictEqual(timeControl.getState(), 'running');
        assert.strictEqual(timeControl.getCurrentPlayer(), 1);

        await wait(0.2);

        // 1s | elapsed
        assert.strictEqual(elapsedEvent, 1);
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(timeControl.getCurrentPlayer(), 1);

        done();
    });


    it('[AbsoluteTimeControl] does not elapses if paused', async function (done) {
        this.timeout(1000);

        const timeControl = new AbsoluteTimeControl({ secondsPerPlayer: 0.3 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause();
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.4);

        // 2s | 3s, resume timer 4s later
        timeControl.resume();
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.1);

        // 1s | 3s, still running
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.2);

        // elapsed | 3s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(elapsedEvent, 0);

        done();
    });


    it('[AbsoluteTimeControl] cannot push while paused', async function (done) {
        this.timeout(1000);

        const timeControl = new AbsoluteTimeControl({ secondsPerPlayer: 0.3 });

        // 3s | 3s
        timeControl.start();

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause();
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.1);

        // 2s | 3s, try to push
        assert.throws(() => timeControl.push(0), TimeControlError);

        done();
    });

    /**
     * FischerTimeControl
     */

    it('[FischerTimeControl] should display exactly 0/paused after time elapsed', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.1, incrementSeconds: 0.1 });

        // 1s | 1s
        timeControl.start();

        await wait(0.2);

        // elapsed | 1s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(0, timeControl.getValues().players[0].totalRemainingTime);

        done();
    });


    it('[FischerTimeControl] elapses on first player', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.5, incrementSeconds: 0.1 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 5s | 5s
        timeControl.start();

        await wait(0.4);

        // 1s | 5s, still running
        assert.strictEqual(elapsedEvent, null);
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.2);

        // elapsed | 5s
        assert.strictEqual(elapsedEvent, 0);
        assert.strictEqual(timeControl.getState(), 'elapsed');

        done();
    });


    it('[FischerTimeControl] elapses on second player', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.3, incrementSeconds: 0.1 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.2);

        // 1s | 3s, player 0 pushes
        timeControl.push(0);

        await wait(0.2);

        // 1s | 1s, still running, current player 1
        assert.strictEqual(elapsedEvent, null);
        assert.strictEqual(timeControl.getState(), 'running');
        assert.strictEqual(timeControl.getCurrentPlayer(), 1);

        await wait(0.2);

        // 1s | elapsed
        assert.strictEqual(elapsedEvent, 1);
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(timeControl.getCurrentPlayer(), 1);

        done();
    });


    it('[FischerTimeControl] does not elapses if paused', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.3, incrementSeconds: 0.1 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause();
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.4);

        // 2s | 3s, resume timer 4s later
        timeControl.resume();
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.1);

        // 1s | 3s, still running
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.2);

        // elapsed | 3s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(elapsedEvent, 0);

        done();
    });


    it('[FischerTimeControl] cannot push while paused', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.3, incrementSeconds: 0.1 });

        // 3s | 3s
        timeControl.start();

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause();
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.1);

        // 2s | 3s, try to push
        assert.throws(() => timeControl.push(0), TimeControlError);

        done();
    });


    it('[FischerTimeControl] time increment', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialSeconds: 0.3, incrementSeconds: 0.4 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.2);

        // 1s | 3s, player 0 pushes, p0 wins 4s
        timeControl.push(0);

        await wait(0.1);

        // 5s | 2s, player 1 pushes
        timeControl.push(1);

        await wait(0.4);

        // 1s | 6s, still running, current player 0
        assert.strictEqual(elapsedEvent, null);
        assert.strictEqual(timeControl.getState(), 'running');
        assert.strictEqual(timeControl.getCurrentPlayer(), 0);

        await wait(0.2);

        // elapsed | 6s
        assert.strictEqual(elapsedEvent, 0);
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime, 0);
        assertTimeEquals(timeControl.getValues().players[1].totalRemainingTime, 0.6);

        done();
    });


    /**
     * SimpleTimeControl
     */

    it('[SimpleTimeControl] cannot push while paused', async function (done) {
        this.timeout(1000);

        const timeControl = new SimpleTimeControl({ secondsPerMove: 0.2 });

        // 2s | 2s
        timeControl.start();

        await wait(0.1);

        // 1s | 2s, pause time control
        timeControl.pause();
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.2);

        // 2s | 3s, try to push
        assert.throws(() => timeControl.push(0), TimeControlError);

        done();
    });


    it('[SimpleTimeControl] displays well remaining time', async function (done) {
        this.timeout(1000);

        const timeControl = new SimpleTimeControl({ secondsPerMove: 0.2 });

        // 2s | 2s
        timeControl.start();

        await wait(0.1);

        // 1s | 2s
        assert.strictEqual(timeControl.getValues().currentPlayer, 0);
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime instanceof Date, true);
        assert.strictEqual(timeControl.getValues().players[1].totalRemainingTime, 0.2);
        assert.strictEqual(timeControl.getState(), 'running');

        await wait(0.2);

        // 2s | 3s, try to push
        assert.strictEqual(timeControl.getState(), 'elapsed');

        done();
    });


    it('[SimpleTimeControl] displays well remaining time after a push', async function (done) {
        this.timeout(1000);

        const timeControl = new SimpleTimeControl({ secondsPerMove: 0.5 });

        // 5s | 5s
        timeControl.start();

        await wait(0.3);

        // 2s | 5s, push
        timeControl.push(0);

        await wait(0.3);

        // 5s | 2s
        assert.strictEqual(timeControl.getValues().currentPlayer, 1);
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime, 0.5);
        assert.strictEqual(timeControl.getValues().players[1].totalRemainingTime instanceof Date, true);
        assert.strictEqual(timeControl.getState(), 'running');

        done();
    });


    it('[SimpleTimeControl] displays well remaining time when paused', async function (done) {
        this.timeout(1000);

        const timeControl = new SimpleTimeControl({ secondsPerMove: 0.5 });

        // 5s | 5s
        timeControl.start();

        await wait(0.3);

        // 2s | 5s, pause
        timeControl.pause();

        await wait(0.3);

        // 5s | 2s
        assert.strictEqual(timeControl.getValues().currentPlayer, 0);
        assert.strictEqual(timeControl.getValues().players[0].totalRemainingTime instanceof Date, false);
        assert.strictEqual(timeControl.getValues().players[1].totalRemainingTime, 0.5);
        assert.strictEqual(timeControl.getState(), 'paused');

        done();
    });


    it('[SimpleTimeControl] elapses', async function (done) {
        this.timeout(1000);

        const timeControl = new SimpleTimeControl({ secondsPerMove: 0.3 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        await wait(0.2);

        // 1s | 3s, pause
        timeControl.push(0);

        await wait(0.5);

        // 5s | 2s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(elapsedEvent, 1);

        done();
    });


    /**
     * ByoYomiTimeControl
     */

    it('[ByoYomiTimeControl] works', async function (done) {
        this.timeout(1000);

        const timeControl = new ByoYomiTimeControl({
            initialSeconds: 0.4,
            periodSeconds: 0.2,
            periodsCount: 2,
        });

        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 4s + 2x2s | 4s + 2x2s
        timeControl.start();
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.8);

        await wait(0.2);

        // 2s + 2x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.6);

        await wait(0.3);

        // 1s + 1x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 1);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0.1);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.3);
        timeControl.push(0);
        // 2s + 1x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 1);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0.2);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.4);

        await wait(0.1);

        // 2s + 1x2s | 3s + 2x2s
        timeControl.push(1);
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[1].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[1].remainingMainTime, 0.3);
        assertTimeEquals(timeControl.getValues().players[1].totalRemainingTime, 0.7);

        assert.strictEqual(elapsedEvent, null);

        done();
    });


    it('[ByoYomiTimeControl] elapses', async function (done) {
        this.timeout(1000);

        const timeControl = new ByoYomiTimeControl({
            initialSeconds: 0.3,
            periodSeconds: 0.2,
            periodsCount: 2,
        });

        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s + 2x2s | 4s + 2x2s
        timeControl.start();
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0.3);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.7);

        await wait(0.6);

        // 1s + 0x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 0);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0.1);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.1);

        await wait(0.2);

        // elapsed | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'elapsed');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 0);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0.0);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0.0);

        assert.strictEqual(elapsedEvent, 0);

        done();
    });

});
