import { randomUUID } from 'node:crypto';
import { ErrorCode, Job, Queue, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import AbstractAiJobQueue from './AbstractAiJobQueue.js';
import { MAX_ATTEMPTS, StaleJobTokenError, type AiJobInfo, type AiJobMeta, type SubmitOptions } from './AiJobQueueInterface.js';
import { AI_JOB_TYPES, isAiJobType, LOCK_MS, type AiJobType, type AiTask, type ReservedJob } from '../protocol.js';
import logger from '../../services/logger.js';

type JobData = {
    task: AiTask;
    meta: AiJobMeta;
    expiresAt: null | number;
};

/**
 * Jobs are removed from redis after this time once finished, keep them a bit for debug.
 */
const KEEP_FINISHED_JOBS_SECONDS = 24 * 3600;

/**
 * Errors thrown by bullmq when a worker tries to finish a job it does not own anymore.
 */
const STALE_LOCK_ERROR_CODES = [
    ErrorCode.JobNotExist,
    ErrorCode.JobLockNotExist,
    ErrorCode.JobNotInState,
    ErrorCode.JobLockMismatch,
];

/**
 * Queue persisted in redis with BullMQ, one bullmq queue per job type.
 *
 * Jobs are not processed by bullmq workers, but manually given to remote workers:
 * bullmq Worker is only used to take next job with a per-reservation token,
 * and to move back stalled jobs to waiting.
 *
 * Only this server submits jobs, so waiting remote workers are notified in process when a job is added.
 */
export default class BullMqAiJobQueue extends AbstractAiJobQueue
{
    private connection: Redis;
    private queues: Record<AiJobType, Queue<JobData>>;
    private workers: Record<AiJobType, Worker<JobData>>;

    /**
     * @param lockMs Lock duration, can be lowered for tests.
     */
    constructor(
        redisUrl: string,
        prefix: string,
        private lockMs = LOCK_MS,
    ) {
        super();

        this.connection = new Redis(redisUrl, {
            maxRetriesPerRequest: null, // required by bullmq Worker
        });

        const queues: Partial<Record<AiJobType, Queue<JobData>>> = {};
        const workers: Partial<Record<AiJobType, Worker<JobData>>> = {};

        for (const type of AI_JOB_TYPES) {
            queues[type] = new Queue<JobData>(`ai-${type}`, {
                connection: this.connection,
                prefix,
                defaultJobOptions: {
                    attempts: MAX_ATTEMPTS,
                    removeOnComplete: { age: KEEP_FINISHED_JOBS_SECONDS, count: 1000 },
                    removeOnFail: { age: KEEP_FINISHED_JOBS_SECONDS, count: 1000 },
                },
            });

            const worker = new Worker<JobData>(`ai-${type}`, null, {
                connection: this.connection,
                prefix,
                autorun: false,
                lockDuration: lockMs,
                stalledInterval: lockMs / 2,
                // Attempts are limited in tryReserve(), with stalls included
                maxStalledCount: MAX_ATTEMPTS,
            });

            worker.on('error', error => logger.error('bullmq AI worker error', { type, message: error.message }));
            worker.on('stalled', jobId => {
                logger.notice('AI job stalled, worker did not send heartbeat', { jobId, type });
                this.notifyAvailable(type);
            });

            void worker.startStalledCheckTimer();

            workers[type] = worker;
        }

        this.queues = queues as Record<AiJobType, Queue<JobData>>;
        this.workers = workers as Record<AiJobType, Worker<JobData>>;
    }

    /**
     * Removes all jobs of a job type queue, including jobs being processed.
     * For maintenance, when a queue is in a bad state.
     */
    static async obliterate(redisUrl: string, prefix: string, type: AiJobType): Promise<void>
    {
        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
        const queue = new Queue(`ai-${type}`, { connection, prefix });

        try {
            await queue.obliterate({ force: true });
        } finally {
            await queue.close();
            await connection.quit();
        }
    }

    /**
     * Job ids are only unique per queue, so prefix them with job type.
     */
    private static toJobId(type: AiJobType, bullJobId: string): string
    {
        return `${type}-${bullJobId}`;
    }

    private async findJob(jobId: string): Promise<null | Job<JobData>>
    {
        // Job type contains "-", but not bullmq job id
        const separator = jobId.lastIndexOf('-');
        const type = jobId.substring(0, separator);

        if (separator < 0 || !isAiJobType(type)) {
            return null;
        }

        return await Job.fromId<JobData>(this.queues[type], jobId.substring(separator + 1)) ?? null;
    }

    private toJobInfo(job: Job<JobData>): AiJobInfo
    {
        const { task, meta, expiresAt } = job.data;

        return {
            jobId: BullMqAiJobQueue.toJobId(task.type, job.id!),
            task,
            meta,
            expiresAt,
        };
    }

    async submit(task: AiTask, { expiresAt, meta }: SubmitOptions): Promise<string>
    {
        const job = await this.queues[task.type].add(task.type, {
            task,
            meta: meta ?? {},
            expiresAt: expiresAt?.getTime() ?? null,
        });

        this.notifyAvailable(task.type);

        return BullMqAiJobQueue.toJobId(task.type, job.id!);
    }

    async cancel(jobId: string): Promise<boolean>
    {
        const job = await this.findJob(jobId);

        if (job === null || await job.getState() !== 'waiting') {
            return false;
        }

        try {
            await job.remove();
            return true;
        } catch (e) {
            // Job has been reserved meanwhile
            logger.debug('Could not cancel AI job', { jobId, message: e?.message });
            return false;
        }
    }

    protected async tryReserve(type: AiJobType): Promise<null | (ReservedJob & { job: AiJobInfo })>
    {
        while (true) {
            const token = randomUUID();
            const job: undefined | Job<JobData> = await this.workers[type].getNextJob(token, { block: false });

            if (!job) {
                return null;
            }

            // bullmq counts failures and stalls separately, count all reservations instead.
            // Also, bullmq defers failing a job stalled too many times until it is fetched again.
            const failure = job.attemptsStarted > MAX_ATTEMPTS
                ? `Job given to workers ${MAX_ATTEMPTS} times without success`
                : job.deferredFailure;

            if (failure) {
                await job.moveToFailed(new UnrecoverableError(failure), token, false);
                this.emitFailed(this.toJobInfo(job), failure);
                continue;
            }

            return {
                jobId: BullMqAiJobQueue.toJobId(type, job.id!),
                token,
                task: job.data.task,
                job: this.toJobInfo(job),
            };
        }
    }

    /**
     * @throws {StaleJobTokenError}
     */
    private async findActiveJob(jobId: string): Promise<Job<JobData>>
    {
        const job = await this.findJob(jobId);

        if (job === null || !(await job.isActive())) {
            throw new StaleJobTokenError(`Job ${jobId} is not active`);
        }

        return job;
    }

    /**
     * Converts bullmq lock errors to StaleJobTokenError.
     */
    private async withLock<T>(jobId: string, callback: () => Promise<T>): Promise<T>
    {
        try {
            return await callback();
        } catch (e) {
            if (STALE_LOCK_ERROR_CODES.includes((e as { code?: number }).code as ErrorCode)) {
                throw new StaleJobTokenError(`Job ${jobId}: ${e.message}`);
            }

            throw e;
        }
    }

    async heartbeat(jobId: string, token: string): Promise<void>
    {
        const job = await this.findActiveJob(jobId);

        const extended = await this.withLock(jobId, () => job.extendLock(token, this.lockMs));

        if (!extended) {
            throw new StaleJobTokenError(`Job ${jobId} is not locked with this token`);
        }
    }

    async complete(jobId: string, token: string, result: unknown): Promise<void>
    {
        const job = await this.findActiveJob(jobId);

        await this.withLock(jobId, () => job.moveToCompleted(result, token, false));

        this.emitCompleted(this.toJobInfo(job), result);
    }

    async fail(jobId: string, token: string, error: string, retryable: boolean): Promise<void>
    {
        const job = await this.findActiveJob(jobId);

        await this.withLock(jobId, () => job.moveToFailed(
            retryable ? new Error(error) : new UnrecoverableError(error),
            token,
            false,
        ));

        if (await job.getState() === 'failed') {
            this.emitFailed(this.toJobInfo(job), error);
            return;
        }

        this.notifyAvailable(job.data.task.type);
    }

    async getJob(jobId: string): Promise<null | AiJobInfo>
    {
        const job = await this.findJob(jobId);

        return job ? this.toJobInfo(job) : null;
    }

    async getCounts(type: AiJobType): Promise<{ waiting: number, active: number }>
    {
        const counts = await this.queues[type].getJobCounts('waiting', 'active');

        return {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
        };
    }

    async drain(): Promise<void>
    {
        await Promise.all(AI_JOB_TYPES.map(type => this.queues[type].drain()));
    }

    async close(): Promise<void>
    {
        await Promise.all(AI_JOB_TYPES.flatMap(type => [
            this.workers[type].close(),
            this.queues[type].close(),
        ]));

        await this.connection.quit();
    }
}
