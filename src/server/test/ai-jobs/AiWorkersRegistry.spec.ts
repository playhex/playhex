import assert from 'assert';
import { beforeEach, describe, it } from 'mocha';
import AiWorkersRegistry from '../../ai-jobs/worker/AiWorkersRegistry.js';

describe('AiWorkersRegistry', () => {
    let registry: AiWorkersRegistry;
    let changes: number;

    beforeEach(() => {
        registry = new AiWorkersRegistry();
        changes = 0;
        registry.on('workersChanged', () => ++changes);
    });

    it('emits workersChanged when a worker connects, not each time it is seen again', () => {
        registry.seen(1, 'a', ['mohex'], null);
        assert.strictEqual(changes, 1);

        registry.seen(1, 'a', ['mohex'], 'job');
        registry.setJob(1, 'a', null);
        assert.strictEqual(changes, 1);

        registry.seen(2, 'a', ['mohex'], null);
        assert.strictEqual(changes, 2);
    });

    it('emits workersChanged when a known worker is removed', () => {
        registry.seen(1, 'a', ['mohex'], null);
        changes = 0;

        registry.remove(1, 'unknown');
        assert.strictEqual(changes, 0);

        registry.remove(1, 'a');
        assert.strictEqual(changes, 1);

        registry.remove(1, 'a');
        assert.strictEqual(changes, 1);
    });
});
