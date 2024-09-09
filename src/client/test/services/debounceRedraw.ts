import assert from 'assert';
import { describe, it } from 'mocha';
import { debounceRedraw } from '../../services/debounceRedraw';
import { setTimeout as wait } from 'timers/promises';

describe('debounceRedraw', () => {
    it('call redraw callback instantly', async () => {
        let called = 0;
        const cb = () => ++called;

        const f = debounceRedraw(cb, 20);

        assert.strictEqual(called, 0);
        f();
        assert.strictEqual(called, 1, 'Called one time at the beginning');
        await wait(40);
        assert.strictEqual(called, 1, 'Not called anymore if not triggered');
    });

    it('call redraw callback instantly, then another time if triggered while waiting', async () => {
        let called = 0;
        const cb = () => ++called;

        const f = debounceRedraw(cb, 20);

        assert.strictEqual(called, 0);
        f();
        f();
        assert.strictEqual(called, 1, 'Called one time at the beginning');
        await wait(40);
        assert.strictEqual(called, 2, 'Called another time if triggered while waiting');
    });

    it('call redraw once every wait-time', async () => {
        let called = 0;
        const cb = () => ++called;

        const f = debounceRedraw(cb, 20);

        assert.strictEqual(called, 0);
        f();
        await wait(5);
        assert.strictEqual(called, 1);
        f();
        await wait(10);
        assert.strictEqual(called, 1);
        f();
        await wait(10);
        assert.strictEqual(called, 2);
        f();
        await wait(10);
        assert.strictEqual(called, 2);
        f();
        await wait(10);
        assert.strictEqual(called, 3);
        f();
        await wait(10);
        assert.strictEqual(called, 3);
        f();
        await wait(10);
        assert.strictEqual(called, 4);
    });
});
