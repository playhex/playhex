import assert from 'assert';
import { it } from 'mocha';
import { TimeControlError, TimeControlInterface } from "../TimeControlInterface";
import { AbsoluteTimeControl } from "../time-controls/AbsoluteTimeControl";
const parallel = require('mocha.parallel');

parallel('TimeControl', () => {

    /*
     * Generic TimeControl
     */

    it('TimeControl: should display exactly 0/paused after time elapsed', function (done) {
        this.timeout(4000);

        const timeControl: TimeControlInterface = new AbsoluteTimeControl(1, 0);
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 1s | 1s
        timeControl.start();

        // elapsed | 1s
        setTimeout(() => {
            assert.strictEqual(timeControl.getState(), 'elapsed');
            assert.strictEqual(0, timeControl.getValues().players[0].totalRemainingTime);

            done();
        }, 2000);
    });

    /*
     * AbsoluteTimeControl
     */

    it('AbsoluteTimeControl: elapses on first player', function (done) {
        this.timeout(8000);

        const timeControl: TimeControlInterface = new AbsoluteTimeControl(5, 0);
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 5s | 5s
        timeControl.start();

        // 1s | 5s, still running
        setTimeout(() => {
            assert.strictEqual(elapsedEvent, null);
            assert.strictEqual(timeControl.getState(), 'running');
        }, 4000);

        // elapsed | 5s
        setTimeout(() => {
            assert.strictEqual(elapsedEvent, 0);
            assert.strictEqual(timeControl.getState(), 'elapsed');

            done();
        }, 6000);
    });


    it('AbsoluteTimeControl: elapses on second player', function (done) {
        this.timeout(8000);

        const timeControl: TimeControlInterface = new AbsoluteTimeControl(3, 0);
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        // 1s | 3s, player 0 pushes
        setTimeout(() => {
            timeControl.push(0);
        }, 2000);

        // 1s | 1s, still running, current player 1
        setTimeout(() => {
            assert.strictEqual(elapsedEvent, null);
            assert.strictEqual(timeControl.getState(), 'running');
            assert.strictEqual(timeControl.getCurrentPlayer(), 1);
        }, 4000);

        // 1s | elapsed
        setTimeout(() => {
            assert.strictEqual(elapsedEvent, 1);
            assert.strictEqual(timeControl.getState(), 'elapsed');
            assert.strictEqual(timeControl.getCurrentPlayer(), 1);

            done();
        }, 6000);
    });


    it('AbsoluteTimeControl: does not elapses if paused', function (done) {
        this.timeout(10000);

        const timeControl: TimeControlInterface = new AbsoluteTimeControl(3, 0);
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        // 2s | 3s, pause time control
        setTimeout(() => {
            timeControl.pause();

            assert.strictEqual(timeControl.getState(), 'paused');
        }, 1000);

        // 2s | 3s, resume timer 4s later
        setTimeout(() => {
            timeControl.resume();

            assert.strictEqual(timeControl.getState(), 'running');
        }, 5000);

        // 1s | 3s, still running
        setTimeout(() => {
            assert.strictEqual(timeControl.getState(), 'running');
        }, 6000);

        // elapsed | 3s
        setTimeout(() => {
            assert.strictEqual(timeControl.getState(), 'elapsed');
            assert.strictEqual(elapsedEvent, 0);

            done();
        }, 8000);
    });


    it('AbsoluteTimeControl: cannot push while paused', function (done) {
        this.timeout(4000);

        const timeControl: TimeControlInterface = new AbsoluteTimeControl(3, 0);
        let elapsedEvent: null | 0 | 1 = null;
        timeControl.on('elapsed', playerLostByTime => elapsedEvent = playerLostByTime);

        // 3s | 3s
        timeControl.start();

        // 2s | 3s, pause time control
        setTimeout(() => {
            timeControl.pause();

            assert.strictEqual(timeControl.getState(), 'paused');
        }, 1000);

        // 2s | 3s, try to push
        setTimeout(() => {
            assert.throws(() => timeControl.push(0), TimeControlError);

            done();
        }, 2000);
    });

});
