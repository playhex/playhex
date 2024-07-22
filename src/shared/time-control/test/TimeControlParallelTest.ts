import assert from 'assert';
import { it } from 'mocha';
import { TimeControlError } from '../TimeControl';
import { FischerTimeControl } from '../time-controls/FischerTimeControl';
import TimeValue, { timeValueToMilliseconds } from '../TimeValue';
import { ByoYomiTimeControl } from '../time-controls/ByoYomiTimeControl';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parallel = require('mocha.parallel');

const wait = async (seconds: number) => new Promise(resolve => setTimeout(resolve, seconds * 1000));

/**
 * Asserts whether time is equals with some milliseconds tolerance.
 *
 * assertTimeEquals(205, 200) asserts true
 * assertTimeEquals(304, 200) asserts false
 * assertTimeEquals(new Date(...), 200) asserts if remaining time is almost same
 */
const assertTimeEquals = (timeValue: TimeValue, time: number): void => {
    if (timeValue instanceof Date) {
        timeValue = timeValueToMilliseconds(timeValue, new Date());
    }

    const diff = Math.abs(timeValue - time);

    assert.strictEqual(diff < 20, true);
};

/**
 * All time controls are tested in a single file to run them all in parallel.
 * All single test should last less than one second. Use a granularity of 100ms.
 */
parallel('TimeControl', () => {

    /**
     * FischerTimeControl
     */

    it('[FischerTimeControl] should display exactly 0/paused after time elapsed', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialTime: 100, timeIncrement: 100 });

        // 1s | 1s
        timeControl.start(new Date());

        await wait(0.2);

        // elapsed | 1s
        assert.strictEqual(timeControl.getState(), 'elapsed');
        assert.strictEqual(0, timeControl.getValues().players[0].totalRemainingTime);

        done();
    });


    it('[FischerTimeControl] elapses on first player', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialTime: 500, timeIncrement: 100 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 5s | 5s
        timeControl.start(new Date());

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

        const timeControl = new FischerTimeControl({ initialTime: 300, timeIncrement: 100 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start(new Date());

        await wait(0.2);

        // 1s | 3s, player 0 pushes
        timeControl.push(0, new Date());

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

        const timeControl = new FischerTimeControl({ initialTime: 300, timeIncrement: 100 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start(new Date());

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause(new Date());
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.4);

        // 2s | 3s, resume timer 4s later
        timeControl.resume(new Date());
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

        const timeControl = new FischerTimeControl({ initialTime: 300, timeIncrement: 100 });

        // 3s | 3s
        timeControl.start(new Date());

        await wait(0.1);

        // 2s | 3s, pause time control
        timeControl.pause(new Date());
        assert.strictEqual(timeControl.getState(), 'paused');

        await wait(0.1);

        // 2s | 3s, try to push
        assert.throws(() => timeControl.push(0, new Date()), TimeControlError);

        done();
    });


    it('[FischerTimeControl] time increment', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialTime: 300, timeIncrement: 400 });
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start(new Date());

        await wait(0.2);

        // 1s | 3s, player 0 pushes, p0 wins 4s
        timeControl.push(0, new Date());

        await wait(0.1);

        // 5s | 2s, player 1 pushes
        timeControl.push(1, new Date());

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
        assertTimeEquals(timeControl.getValues().players[1].totalRemainingTime, 600);

        done();
    });


    it('[FischerTimeControl] elapses player when restoring old time control already elapsed', async function (done) {
        this.timeout(1000);

        const timeControl = new FischerTimeControl({ initialTime: 300, timeIncrement: 100 });

        let eventElapsedPlayer: null | number = null;
        let eventElapsedAt: null | Date = null;

        timeControl.on('elapsed', (elapsedPlayer, elapsedAt) => {
            eventElapsedPlayer = elapsedPlayer;
            eventElapsedAt = elapsedAt;
        });

        const oldElapsesAt = new Date('2000-01-01');

        timeControl.setValues({
            state: 'running',
            currentPlayer: 0,
            players: [
                { totalRemainingTime: oldElapsesAt },
                { totalRemainingTime: 20 },
            ],
        });

        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
        assert.strictEqual(eventElapsedPlayer, 0);
        assert.strictEqual(eventElapsedAt, oldElapsesAt);

        done();
    });


    /**
     * ByoYomiTimeControl
     */

    it('[ByoYomiTimeControl] works', async function (done) {
        this.timeout(1000);

        const timeControl = new ByoYomiTimeControl({
            initialTime: 400,
            periodTime: 200,
            periodsCount: 2,
        });

        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 4s + 2x2s | 4s + 2x2s
        timeControl.start(new Date());
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 800);

        await wait(0.2);

        // 2s + 2x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 600);

        await wait(0.3);

        // 1s + 1x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 1);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 100);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 300);
        timeControl.push(0, new Date());
        // 2s + 1x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 1);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 200);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 400);

        await wait(0.1);

        // 2s + 1x2s | 3s + 2x2s
        timeControl.push(1, new Date());
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[1].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[1].remainingMainTime, 300);
        assertTimeEquals(timeControl.getValues().players[1].totalRemainingTime, 700);

        assert.strictEqual(elapsedEvent, null);

        done();
    });


    it('[ByoYomiTimeControl] elapses', async function (done) {
        this.timeout(1000);

        const timeControl = new ByoYomiTimeControl({
            initialTime: 300,
            periodTime: 200,
            periodsCount: 2,
        });

        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s + 2x2s | 4s + 2x2s
        timeControl.start(new Date());
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 2);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 300);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 700);

        await wait(0.6);

        // 1s + 0x2s | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'running');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 0);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 100);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 100);

        await wait(0.2);

        // elapsed | 4s + 2x2s
        assert.strictEqual(timeControl.getValues().state, 'elapsed');
        assert.strictEqual(timeControl.getValues().players[0].remainingPeriods, 0);
        assertTimeEquals(timeControl.getValues().players[0].remainingMainTime, 0);
        assertTimeEquals(timeControl.getValues().players[0].totalRemainingTime, 0);

        assert.strictEqual(elapsedEvent, 0);

        done();
    });


    it('[ByoYomiTimeControl] elapses when setting 2 periods and period time = 2', async function (done) {
        this.timeout(300);

        const timeControl = new ByoYomiTimeControl({
            initialTime: 100,
            periodTime: 0,
            periodsCount: 2,
        });

        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        timeControl.start(new Date());
        await wait(0.2);

        assert.strictEqual(elapsedEvent, 0);

        done();
    });

});
