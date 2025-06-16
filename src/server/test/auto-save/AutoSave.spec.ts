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
});
