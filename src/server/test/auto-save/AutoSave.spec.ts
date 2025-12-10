import assert from 'assert';
import { describe, it } from 'mocha';
import { setTimeout as wait } from 'timers/promises';
import { AutoSave } from '../../auto-save/AutoSave.js';

describe('AutoSave', () => {
    it('persists only twice if I persist 3 times', async () => {
        let callCount = 0;

        const autoSave = new AutoSave<number>(async () => {
            callCount++;
            await wait(100);
            return callCount;
        });

        const start = Date.now();

        const p1 = autoSave.save();
        const p2 = autoSave.save();
        const p3 = autoSave.save();

        const r1 = await p1;
        const r2 = await p2;
        const r3 = await p3;

        assert.strictEqual(r1, 1, 'first call returns first response');
        assert.strictEqual(r2, 2, 'second call returns second response');
        assert.strictEqual(r3, 2, 'third call returns second response');

        assert.strictEqual(callCount, 2, 'Callback must be called only twice');

        const duration = Date.now() - start;
        assert.ok(duration >= 180 && duration < 220, 'should last about 200ms');
    });

    it('persists when I wait first callback is resolved', async () => {
        let called = 0;
        let resolved = 0;
        const t0 = new Date();
        const msElapsed = () => new Date().getTime() - t0.getTime();

        const autoSave = new AutoSave<number>(async () => {
            const call = ++called;
            await wait(100);
            ++resolved;
            return call;
        });

        const p1 = autoSave.save(); // call now

        assert.strictEqual(called, 1, 'first call');
        assert.strictEqual(resolved, 0);

        const p2 = autoSave.save(); // queue

        assert.strictEqual(called, 1, 'still called once');
        assert.strictEqual(resolved, 0);
        assert.ok(msElapsed() < 50, 'still in the beginning');

        const r1 = await p1; // first call done, second call starts

        assert.ok(msElapsed() > 50 && msElapsed() < 150, 'only waited for 1 call');
        assert.strictEqual(r1, 1, 'first call returns first response');
        assert.strictEqual(called, 2, 'first call ended, second call already sent');
        assert.strictEqual(resolved, 1, '2nd call not yet resolved');

        const p3 = autoSave.save(); // queue
        const p4 = autoSave.save(); // should returns same result as p3

        const r2 = await p2;

        assert.ok(msElapsed() > 150 && msElapsed() < 250, 'waited for 2 calls');
        assert.strictEqual(r2, 2, 'second call returns second response');
        assert.strictEqual(called, 3, 'second call ended, third call already sent');
        assert.strictEqual(resolved, 2);

        const r3 = await p3;
        const r4 = await p4;

        assert.ok(msElapsed() > 250 && msElapsed() < 350, 'waited for 3 calls');
        assert.strictEqual(called, 3, 'no more call should have been sent');
        assert.strictEqual(r3, r4, 'same results');
        assert.strictEqual(resolved, 3);
    });

    it('persist twice if called sychronously', async () => {
        let callCount = 0;

        const autoSave = new AutoSave<number>(async () => {
            await wait(100);
            return ++callCount;
        });

        assert.strictEqual(callCount, 0);
        assert.strictEqual(await autoSave.save(), 1);
        assert.strictEqual(callCount, 1);
        assert.strictEqual(await autoSave.save(), 2);
        assert.strictEqual(callCount, 2);
    });

    it('tries to persist again after last save threw an error', async () => {
        let callCount = 0;

        const autoSave = new AutoSave<number>(async () => {
            await wait(100);
            ++callCount;

            if (callCount < 2) {
                throw new Error('First save throws an error');
            }

            return callCount;
        });

        try {
            await autoSave.save();
            assert.fail('First save should throw error');
        } catch {
        }

        assert.strictEqual(callCount, 1, 'First call, error thrown');
        assert.strictEqual(await autoSave.save(), 2);
        assert.strictEqual(callCount, 2, 'Second save should call again');
    });
});
