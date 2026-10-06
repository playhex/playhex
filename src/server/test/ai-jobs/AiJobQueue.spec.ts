import assert from 'assert';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { MAX_ATTEMPTS, StaleJobTokenError, type AiJobInfo, type AiJobQueueInterface } from '../../ai-jobs/queue/AiJobQueueInterface.js';
import InMemoryAiJobQueue from '../../ai-jobs/queue/InMemoryAiJobQueue.js';
import BullMqAiJobQueue from '../../ai-jobs/queue/BullMqAiJobQueue.js';
import type { AiTask } from '../../ai-jobs/protocol.js';

const LOCK_MS = 600;

const ANALYZE_MOVE = 'katahex-mcts-analyze-move';
const KATAHEX_MOVE = 'katahex-intuition-move';

const task = (moveIndex = 0): AiTask => ({
    type: ANALYZE_MOVE,
    data: {
        moveIndex,
        move: 'a1',
        color: 'black',
        isLastMoveOfGame: false,
        movesHistory: '',
        size: 11,
        maxPlayouts: 10,
    },
});

const game = { size: 11, movesHistory: '', currentPlayer: 'black' as const, swapRule: false };

const moveTask = (type: typeof KATAHEX_MOVE | 'mohex' = KATAHEX_MOVE): AiTask => {
    return type === 'mohex'
        ? { type, data: { game, maxGames: 100 } }
        : { type, data: { game } };
};

const moveIndexOf = (task: AiTask): number => (task.data as { moveIndex: number }).moveIndex;

const collectEvents = (queue: AiJobQueueInterface) => {
    const completed: [AiJobInfo, unknown][] = [];
    const failed: [AiJobInfo, string][] = [];

    queue.onCompleted((job, result) => completed.push([job, result]));
    queue.onFailed((job, error) => failed.push([job, error]));

    return { completed, failed };
};

const testQueue = (name: string, createQueue: () => AiJobQueueInterface) => describe(name, function () {
    this.timeout(10_000);

    let queue: AiJobQueueInterface;

    beforeEach(async () => {
        queue = createQueue();
        await queue.drain();
    });

    afterEach(async () => {
        await queue.close();
    });

    it('gives jobs by submission order', async () => {
        await queue.submit(task(0), { expiresAt: null });
        await queue.submit(task(1), { expiresAt: null });
        await queue.submit(task(2), { expiresAt: null });

        const order: number[] = [];

        for (let i = 0; i < 3; ++i) {
            const reserved = await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });
            assert.ok(reserved);
            order.push(moveIndexOf(reserved.task));
        }

        assert.deepStrictEqual(order, [0, 1, 2]);
    });

    it('gives jobs of higher priority job types first', async () => {
        await queue.submit(task(0), { expiresAt: null });
        await queue.submit(moveTask(), { expiresAt: null });

        const first = await queue.reserve([ANALYZE_MOVE, KATAHEX_MOVE], { waitMs: 0 });
        const second = await queue.reserve([ANALYZE_MOVE, KATAHEX_MOVE], { waitMs: 0 });

        assert.strictEqual(first?.task.type, KATAHEX_MOVE);
        assert.strictEqual(second?.task.type, ANALYZE_MOVE);
    });

    it('does not give jobs of other types, and is not blocked by them', async () => {
        await queue.submit(moveTask('mohex'), { expiresAt: null });

        assert.strictEqual(await queue.reserve([KATAHEX_MOVE], { waitMs: 0 }), null);

        await queue.submit(moveTask(), { expiresAt: null });

        const reserved = await queue.reserve([KATAHEX_MOVE], { waitMs: 0 });
        assert.strictEqual(reserved?.task.type, KATAHEX_MOVE);
    });

    it('long-polls until a job is submitted', async () => {
        const reserving = queue.reserve([ANALYZE_MOVE], { waitMs: 3000 });

        await setTimeout(100);
        await queue.submit(task(5), { expiresAt: null });

        const reserved = await reserving;
        assert.ok(reserved);
        assert.strictEqual(moveIndexOf(reserved.task), 5);
    });

    it('gives a job available without notification, by polling', async () => {
        // i.e job submitted between reserve() checking queue and listening for notifications
        (queue as unknown as { notifyAvailable: () => void }).notifyAvailable = () => {};

        const reserving = queue.reserve([ANALYZE_MOVE], { waitMs: 5000 });

        await setTimeout(100);
        await queue.submit(task(5), { expiresAt: null });

        const reserved = await reserving;
        assert.ok(reserved);
        assert.strictEqual(moveIndexOf(reserved.task), 5);
    });

    it('returns null after waitMs, or when aborted', async () => {
        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: 100 }), null);

        const controller = new AbortController();
        const reserving = queue.reserve([ANALYZE_MOVE], { waitMs: 5000, signal: controller.signal });
        controller.abort();

        assert.strictEqual(await reserving, null);
    });

    it('emits completed with meta, and refuses a wrong token', async () => {
        const events = collectEvents(queue);
        await queue.submit(task(), { expiresAt: null, meta: { gameId: 42 } });

        const reserved = await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });
        assert.ok(reserved);

        await assert.rejects(queue.complete(reserved.jobId, 'wrong-token', 'x'), StaleJobTokenError);
        await queue.complete(reserved.jobId, reserved.token, { some: 'result' });
        await assert.rejects(queue.complete(reserved.jobId, reserved.token, 'x'), StaleJobTokenError);

        assert.strictEqual(events.completed.length, 1);
        assert.deepStrictEqual(events.completed[0][0].meta, { gameId: 42 });
        assert.deepStrictEqual(events.completed[0][1], { some: 'result' });
    });

    it('gives job back when retryable fail, and fails definitively when not retryable', async () => {
        const events = collectEvents(queue);
        await queue.submit(task(), { expiresAt: null });

        let reserved = await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });
        assert.ok(reserved);
        await queue.fail(reserved.jobId, reserved.token, 'worker crashed', true);

        reserved = await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });
        assert.ok(reserved);
        await queue.fail(reserved.jobId, reserved.token, 'unsupported board size', false);

        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: 0 }), null);
        assert.strictEqual(events.failed.length, 1);
        assert.strictEqual(events.failed[0][1], 'unsupported board size');
    });

    it('fails expired jobs instead of giving them', async () => {
        const events = collectEvents(queue);
        await queue.submit(task(), { expiresAt: new Date(Date.now() - 1000) });

        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: 0 }), null);
        assert.strictEqual(events.failed.length, 1);
    });

    it('gives job to another worker when heartbeats stop, and refuses the stale token', async function () {
        await queue.submit(task(), { expiresAt: null });

        const first = await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });
        assert.ok(first);

        // Heartbeats keep the job
        await setTimeout(LOCK_MS / 2);
        await queue.heartbeat(first.jobId, first.token);
        await setTimeout(LOCK_MS / 2);
        await queue.heartbeat(first.jobId, first.token);
        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: 0 }), null);

        // No more heartbeats: given to w2
        const second = await queue.reserve([ANALYZE_MOVE], { waitMs: LOCK_MS * 4 });
        assert.ok(second);
        assert.strictEqual(second.jobId, first.jobId);

        await assert.rejects(queue.heartbeat(first.jobId, first.token), StaleJobTokenError);
        await assert.rejects(queue.complete(first.jobId, first.token, 'x'), StaleJobTokenError);
        await queue.complete(second.jobId, second.token, 'x');
    });

    it('fails definitively after MAX_ATTEMPTS reservations, stalls included', async () => {
        const events = collectEvents(queue);
        await queue.submit(task(), { expiresAt: null });

        for (let i = 0; i < MAX_ATTEMPTS; ++i) {
            assert.ok(await queue.reserve([ANALYZE_MOVE], { waitMs: LOCK_MS * 4 }), `reservation ${i + 1}`);
        }

        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: LOCK_MS * 4 }), null);
        assert.strictEqual(events.failed.length, 1);
    });

    it('cancels a waiting job, but not a reserved one', async () => {
        const jobId = await queue.submit(task(), { expiresAt: null });
        assert.strictEqual(await queue.cancel(jobId), true);
        assert.strictEqual(await queue.reserve([ANALYZE_MOVE], { waitMs: 0 }), null);

        const reservedJobId = await queue.submit(task(), { expiresAt: null });
        assert.ok(await queue.reserve([ANALYZE_MOVE], { waitMs: 0 }));
        assert.strictEqual(await queue.cancel(reservedJobId), false);
    });

    it('counts waiting and active jobs', async () => {
        await queue.submit(task(), { expiresAt: null });
        await queue.submit(task(), { expiresAt: null });
        await queue.reserve([ANALYZE_MOVE], { waitMs: 0 });

        assert.deepStrictEqual(await queue.getCounts(ANALYZE_MOVE), { waiting: 1, active: 1 });
    });
});

testQueue('InMemoryAiJobQueue', () => new InMemoryAiJobQueue({}, LOCK_MS));

describe('InMemoryAiJobQueue local processors', () => {
    it('processes jobs of a job type locally', async () => {
        const queue = new InMemoryAiJobQueue({
            davies: () => Promise.resolve('e5'),
        });

        const events = collectEvents(queue);
        await queue.submit({ type: 'davies', data: { game, level: 1 } }, { expiresAt: null });
        await setTimeout(10);

        assert.strictEqual(events.completed.length, 1);
        assert.strictEqual(events.completed[0][1], 'e5');
        assert.strictEqual(await queue.reserve(['davies'], { waitMs: 0 }), null);

        await queue.close();
    });
});

/*
 * Run with a redis >= 6, i.e:
 *  docker run --rm -p 6390:6379 redis:8
 *  AI_JOBS_TEST_REDIS_URL=redis://localhost:6390 pnpm test
 */
const { AI_JOBS_TEST_REDIS_URL } = process.env;

if (AI_JOBS_TEST_REDIS_URL) {
    testQueue('BullMqAiJobQueue', () => new BullMqAiJobQueue(AI_JOBS_TEST_REDIS_URL, `hex-test-ai-jobs-${randomUUID()}`, LOCK_MS));
}
