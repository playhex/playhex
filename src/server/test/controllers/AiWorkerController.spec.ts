import assert from 'assert';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, it } from 'mocha';
import { HttpError } from 'routing-controllers';
import type { Request, Response } from 'express';
import AiWorkerController from '../../controllers/http/api/AiWorkerController.js';
import AiJobService, { AiJobError } from '../../ai-jobs/AiJobService.js';
import AiWorkersRegistry from '../../ai-jobs/worker/AiWorkersRegistry.js';
import type PlayerAiWorkerKeyRepository from '../../repositories/PlayerAiWorkerKeyRepository.js';
import type { ReservedJob } from '../../ai-jobs/protocol.js';
import type { PlayerAiWorkerKey } from '../../../shared/app/models/index.js';

const KEY = 'valid-key';

const game = { size: 11, movesHistory: 'f6', currentPlayer: 'white' as const, swapRule: false };

const isHttpError = (httpCode: number) => (e: unknown): boolean =>
    e instanceof HttpError && e.httpCode === httpCode
;

const createRequest = (key: null | string = KEY): Request => ({
    ip: '127.0.0.1',
    get: (header: string) => header === 'Authorization' && key !== null ? `Bearer ${key}` : undefined,
}) as unknown as Request;

const createResponse = (): Response => new EventEmitter() as unknown as Response;

describe('AiWorkerController', () => {
    let nodeEnv: undefined | string;
    let aiJobService: AiJobService;
    let aiWorkersRegistry: AiWorkersRegistry;
    let controller: AiWorkerController;

    beforeEach(() => {
        // Use in memory queue
        nodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        aiWorkersRegistry = new AiWorkersRegistry();
        aiJobService = new AiJobService(aiWorkersRegistry);

        const playerAiWorkerKeyRepository = {
            findEnabledByKey: (key: string) => Promise.resolve(key === KEY ? { id: 1 } as PlayerAiWorkerKey : null),
            touch: () => Promise.resolve(),
        } as unknown as PlayerAiWorkerKeyRepository;

        controller = new AiWorkerController(aiJobService, aiWorkersRegistry, playerAiWorkerKeyRepository);
    });

    afterEach(async () => {
        await aiJobService.queue.close();

        if (nodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = nodeEnv;
        }
    });

    /**
     * Submit a bot move, and let worker take it.
     */
    const submitAndTakeMove = async () => {
        const moving = aiJobService.calculateMove({ type: 'katahex-intuition-move', data: { game } });
        await setImmediate();

        const job = await controller.next(createRequest(), createResponse(), { types: ['katahex-intuition-move'], workerId: 'w1' });
        assert.ok(job);

        return { moving, job };
    };

    it('refuses missing or invalid key', async () => {
        await assert.rejects(controller.next(createRequest(null), createResponse(), { types: ['davies'], workerId: 'w1' }), isHttpError(401));
        await assert.rejects(controller.next(createRequest('wrong'), createResponse(), { types: ['davies'], workerId: 'w1' }), isHttpError(401));
    });

    it('refuses unknown job types', async () => {
        await assert.rejects(controller.next(createRequest(), createResponse(), { types: ['unknown'], workerId: 'w1' }), isHttpError(400));
    });

    it('gives a job, and registers worker as online for its job types', async () => {
        const { moving, job } = await submitAndTakeMove();

        assert.strictEqual(job.task.type, 'katahex-intuition-move');
        assert.strictEqual(aiWorkersRegistry.getOnlineWorkers('katahex-intuition-move')[0]?.jobId, job.jobId);
        assert.strictEqual(aiJobService.isJobTypeAvailable('katahex-intuition-move'), true);
        assert.strictEqual(aiJobService.isJobTypeAvailable('mohex'), false);

        await controller.result(createRequest(), job.jobId, { workerId: 'w1', token: job.token, result: 'g7' });

        assert.strictEqual(await moving, 'g7');
    });

    it('gives job back to queue when result is invalid', async () => {
        const { moving, job } = await submitAndTakeMove();

        await assert.rejects(controller.result(createRequest(), job.jobId, { workerId: 'w1', token: job.token, result: 'f6' }), isHttpError(400));
        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-move'), { waiting: 1, active: 0 });

        const retried = await controller.next(createRequest(), createResponse(), { types: ['katahex-intuition-move'], workerId: 'w2' }) as ReservedJob;
        await controller.result(createRequest(), retried.jobId, { workerId: 'w2', token: retried.token, result: 'g7' });

        assert.strictEqual(await moving, 'g7');
    });

    it('refuses heartbeat and result from a worker not owning the job anymore', async () => {
        const { moving, job } = await submitAndTakeMove();

        await assert.rejects(controller.heartbeat(createRequest(), job.jobId, { workerId: 'w1', token: 'stale' }), isHttpError(409));
        await assert.rejects(controller.result(createRequest(), job.jobId, { workerId: 'w1', token: 'stale', result: 'g7' }), isHttpError(409));

        await controller.heartbeat(createRequest(), job.jobId, { workerId: 'w1', token: job.token });
        await controller.result(createRequest(), job.jobId, { workerId: 'w1', token: job.token, result: 'g7' });

        assert.strictEqual(await moving, 'g7');
        await assert.rejects(controller.result(createRequest(), job.jobId, { workerId: 'w1', token: job.token, result: 'g7' }), isHttpError(409));
    });

    it('gives job back on retryable fail, fails move on non retryable fail', async () => {
        const { moving, job } = await submitAndTakeMove();

        await controller.fail(createRequest(), job.jobId, { workerId: 'w1', token: job.token, error: 'engine crashed', retryable: true });
        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-move'), { waiting: 1, active: 0 });

        const retried = await controller.next(createRequest(), createResponse(), { types: ['katahex-intuition-move'], workerId: 'w1' }) as ReservedJob;
        await controller.fail(createRequest(), retried.jobId, { workerId: 'w1', token: retried.token, error: 'unsupported', retryable: false });

        await assert.rejects(moving, AiJobError);
    });
});
