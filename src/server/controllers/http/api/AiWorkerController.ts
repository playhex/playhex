import { Service } from 'typedi';
import { Body, HttpError, JsonController, OnUndefined, Param, Post, Req, Res } from 'routing-controllers';
import type { Request, Response } from 'express';
import AiJobService from '../../../ai-jobs/AiJobService.js';
import AiWorkersRegistry from '../../../ai-jobs/worker/AiWorkersRegistry.js';
import { StaleJobTokenError } from '../../../ai-jobs/queue/AiJobQueueInterface.js';
import { InvalidAiResultError, validateAiResult } from '../../../ai-jobs/worker/validateAiResult.js';
import { AI_JOB_TYPES, isAiJobType, LONG_POLL_MS, type AiJobType, type ReservedJob } from '../../../ai-jobs/protocol.js';
import PlayerAiWorkerKeyRepository from '../../../repositories/PlayerAiWorkerKeyRepository.js';
import { rateLimiterConsumeAiWorkerNextJob, rateLimiterConsumeFailedApiKey } from '../../../services/rate-limiters.js';
import { PlayerAiWorkerKey } from '../../../../shared/app/models/index.js';
import logger from '../../../services/logger.js';

const isObject = (value: unknown): value is { [key: string]: unknown } =>
    typeof value === 'object' && value !== null
;

const requireString = (body: unknown, field: string, maxLength = 64): string => {
    const value = isObject(body) ? body[field] : undefined;

    if (typeof value !== 'string' || value.length === 0 || value.length > maxLength) {
        throw new HttpError(400, `"${field}" must be a non-empty string of max ${maxLength} chars`);
    }

    return value;
};

const requireJobTypes = (body: unknown): AiJobType[] => {
    const types = isObject(body) ? body.types : undefined;

    if (!Array.isArray(types) || types.length === 0 || types.length > AI_JOB_TYPES.length) {
        throw new HttpError(400, '"types" must be a non-empty array of job types. If your worker is outdated, update it (i.e docker pull playhex/worker-katahex)');
    }

    for (const type of types) {
        if (!isAiJobType(type)) {
            throw new HttpError(400, `Unknown job type "${String(type)}", expected one of: ${AI_JOB_TYPES.join(', ')}`);
        }
    }

    return [...new Set(types as AiJobType[])];
};

/**
 * Api used by remote AI workers to pull jobs and send results.
 * See protocol in src/server/ai-jobs/protocol.ts
 */
@JsonController()
@Service()
export default class AiWorkerController
{
    constructor(
        private aiJobService: AiJobService,
        private aiWorkersRegistry: AiWorkersRegistry,
        private playerAiWorkerKeyRepository: PlayerAiWorkerKeyRepository,
    ) {}

    /**
     * @throws {HttpError} 401 if key is missing, invalid or revoked.
     */
    private async authenticate(request: Request): Promise<PlayerAiWorkerKey>
    {
        const authorization = request.get('Authorization');
        const key = authorization?.startsWith('Bearer ')
            ? authorization.substring('Bearer '.length)
            : null;

        const playerAiWorkerKey = key
            ? await this.playerAiWorkerKeyRepository.findEnabledByKey(key)
            : null;

        if (playerAiWorkerKey === null) {
            await rateLimiterConsumeFailedApiKey(request.ip);
            throw new HttpError(401, 'Invalid or revoked AI worker key. Add header Authorization: Bearer <key>');
        }

        void this.playerAiWorkerKeyRepository.touch(playerAiWorkerKey).catch(e => {
            logger.warning('Could not update AI worker key lastSeenAt', { message: e?.message });
        });

        return playerAiWorkerKey;
    }

    /**
     * Runs a queue operation on a job owned by the worker.
     *
     * @throws {HttpError} 409 if worker does not own this job anymore.
     */
    private async withJobToken<T>(callback: () => Promise<T>): Promise<T>
    {
        try {
            return await callback();
        } catch (e) {
            if (e instanceof StaleJobTokenError) {
                throw new HttpError(409, 'Job not owned by this worker anymore, abandon it');
            }

            throw e;
        }
    }

    /**
     * Get next job to process.
     * Waits up to LONG_POLL_MS for a job, then responds 204 so that worker requests again.
     */
    @Post('/api/ai-workers/jobs/next')
    @OnUndefined(204)
    async next(
        @Req() request: Request,
        @Res() response: Response,
        @Body() body: unknown,
    ): Promise<undefined | ReservedJob> {
        const playerAiWorkerKey = await this.authenticate(request);
        const types = requireJobTypes(body);
        const workerId = requireString(body, 'workerId');

        await rateLimiterConsumeAiWorkerNextJob(playerAiWorkerKey.id!);

        this.aiWorkersRegistry.seen(playerAiWorkerKey.id!, workerId, types, null);

        // Stop waiting for a job if worker disconnects, and consider it offline now.
        // "close" is also emitted after response is sent, ignore it in this case.
        const abortController = new AbortController();
        response.on('close', () => {
            if (response.writableFinished) {
                return;
            }

            abortController.abort();
            this.aiWorkersRegistry.remove(playerAiWorkerKey.id!, workerId);
        });

        const reserved = await this.aiJobService.queue.reserve(types, {
            waitMs: LONG_POLL_MS,
            signal: abortController.signal,
        });

        if (reserved === null) {
            return;
        }

        // Worker disconnected while job was being reserved, give it back instead of waiting for lock to expire
        if (abortController.signal.aborted) {
            await this.aiJobService.queue.fail(reserved.jobId, reserved.token, 'Worker disconnected before receiving job', true);
            return;
        }

        this.aiWorkersRegistry.seen(playerAiWorkerKey.id!, workerId, types, reserved.jobId);

        logger.debug('AI job given to worker', { jobId: reserved.jobId, type: reserved.task.type, keyId: playerAiWorkerKey.id, workerId });

        const { jobId, token, task } = reserved;

        return { jobId, token, task };
    }

    /**
     * Worker is still processing this job, extends its lock.
     */
    @Post('/api/ai-workers/jobs/:jobId/heartbeat')
    @OnUndefined(204)
    async heartbeat(
        @Req() request: Request,
        @Param('jobId') jobId: string,
        @Body() body: unknown,
    ): Promise<void> {
        const playerAiWorkerKey = await this.authenticate(request);
        const token = requireString(body, 'token');
        const workerId = requireString(body, 'workerId');

        await this.withJobToken(() => this.aiJobService.queue.heartbeat(jobId, token));

        this.aiWorkersRegistry.setJob(playerAiWorkerKey.id!, workerId, jobId);
    }

    @Post('/api/ai-workers/jobs/:jobId/result')
    @OnUndefined(204)
    async result(
        @Req() request: Request,
        @Param('jobId') jobId: string,
        @Body() body: unknown,
    ): Promise<void> {
        const playerAiWorkerKey = await this.authenticate(request);
        const token = requireString(body, 'token');
        const workerId = requireString(body, 'workerId');
        const { queue } = this.aiJobService;
        const job = await queue.getJob(jobId);

        if (job === null) {
            throw new HttpError(409, 'Job not found, abandon it');
        }

        this.aiWorkersRegistry.setJob(playerAiWorkerKey.id!, workerId, null);

        let result: unknown;

        try {
            result = validateAiResult(job.task, isObject(body) ? body.result : undefined);
        } catch (e) {
            if (!(e instanceof InvalidAiResultError)) {
                throw e;
            }

            logger.warning('Invalid AI job result from worker', { jobId, type: job.task.type, keyId: playerAiWorkerKey.id, workerId, error: e.message });

            await this.withJobToken(() => queue.fail(jobId, token, `Invalid result: ${e.message}`, true));

            throw new HttpError(400, `Invalid result: ${e.message}`);
        }

        await this.withJobToken(() => queue.complete(jobId, token, result));

        logger.info('AI job result accepted', { jobId, type: job.task.type, keyId: playerAiWorkerKey.id, workerId });
    }

    /**
     * Worker could not process the job.
     * If retryable, job is given to another worker (i.e engine crashed),
     * else it fails definitively (i.e task cannot be processed by this engine).
     */
    @Post('/api/ai-workers/jobs/:jobId/fail')
    @OnUndefined(204)
    async fail(
        @Req() request: Request,
        @Param('jobId') jobId: string,
        @Body() body: unknown,
    ): Promise<void> {
        const playerAiWorkerKey = await this.authenticate(request);
        const token = requireString(body, 'token');
        const workerId = requireString(body, 'workerId');
        const error = requireString(body, 'error', 1000);
        const retryable = isObject(body) && body.retryable === true;

        this.aiWorkersRegistry.setJob(playerAiWorkerKey.id!, workerId, null);

        await this.withJobToken(() => this.aiJobService.queue.fail(jobId, token, error, retryable));

        logger.notice('AI job failed by worker', { jobId, keyId: playerAiWorkerKey.id, workerId, error, retryable });
    }

    /**
     * Worker is stopping, consider it offline now instead of waiting for it to time out.
     */
    @Post('/api/ai-workers/disconnect')
    @OnUndefined(204)
    async disconnect(
        @Req() request: Request,
        @Body() body: unknown,
    ): Promise<void> {
        const playerAiWorkerKey = await this.authenticate(request);
        const workerId = requireString(body, 'workerId');

        this.aiWorkersRegistry.remove(playerAiWorkerKey.id!, workerId);

        logger.info('AI worker disconnected', { keyId: playerAiWorkerKey.id, workerId });
    }
}
