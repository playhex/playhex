import { randomUUID } from 'node:crypto';
import AbstractAiJobQueue from './AbstractAiJobQueue.js';
import { MAX_ATTEMPTS, StaleJobTokenError, type AiJobInfo, type SubmitOptions } from './AiJobQueueInterface.js';
import { LOCK_MS, type AiJobType, type AiTask, type ReservedJob } from '../protocol.js';
import logger from '../../services/logger.js';

type InMemoryJob = AiJobInfo & {
    attemptsMade: number;

    /**
     * Set while job is reserved by a worker.
     */
    lock: null | {
        token: string;
        timeout: NodeJS.Timeout;
    };
};

/**
 * Returns a promise from a synchronous callback, rejected if callback throws.
 */
const settle = <T>(callback: () => T): Promise<T> => new Promise(resolve => resolve(callback()));

/**
 * Process a task directly in this process, instead of waiting for a remote worker.
 */
export type LocalProcessor = (task: AiTask) => Promise<unknown>;

/**
 * Queue kept in memory, used when there is no redis (development).
 * Jobs are lost on restart.
 */
export default class InMemoryAiJobQueue extends AbstractAiJobQueue
{
    private jobs = new Map<string, InMemoryJob>();

    private lastJobId = 0;

    /**
     * @param localProcessors Jobs of these types are processed directly in this process,
     *                        no need to run a worker (i.e davies, which is lightweight).
     * @param lockMs Lock duration, can be lowered for tests.
     */
    constructor(
        private localProcessors: Partial<Record<AiJobType, LocalProcessor>> = {},
        private lockMs = LOCK_MS,
    ) {
        super();
    }

    hasLocalProcessor(type: AiJobType): boolean
    {
        return type in this.localProcessors;
    }

    submit(task: AiTask, { expiresAt, meta }: SubmitOptions): Promise<string>
    {
        return settle(() => {
            const jobId = String(++this.lastJobId);

            // Map keeps insertion order, so jobs are iterated oldest first
            this.jobs.set(jobId, {
                jobId,
                task,
                meta: meta ?? {},
                expiresAt: expiresAt?.getTime() ?? null,
                attemptsMade: 0,
                lock: null,
            });

            const localProcessor = this.localProcessors[task.type];

            if (localProcessor) {
                // Let caller listen to job result before processing it
                setImmediate(() => void this.processLocally(localProcessor, task.type));
            } else {
                this.notifyAvailable(task.type);
            }

            return jobId;
        });
    }

    private async processLocally(localProcessor: LocalProcessor, type: AiJobType): Promise<void>
    {
        const reserved = await this.tryReserve(type);

        if (reserved === null) {
            return;
        }

        try {
            await this.complete(reserved.jobId, reserved.token, await localProcessor(reserved.task));
        } catch (e) {
            logger.error('Error while processing AI job locally', { jobId: reserved.jobId, type, message: e?.message });
            await this.fail(reserved.jobId, reserved.token, e?.message ?? String(e), false).catch(() => {});
        }
    }

    cancel(jobId: string): Promise<boolean>
    {
        return settle(() => {
            const job = this.jobs.get(jobId);

            if (!job || job.lock !== null) {
                return false;
            }

            this.jobs.delete(jobId);

            return true;
        });
    }

    protected tryReserve(type: AiJobType): Promise<null | (ReservedJob & { job: AiJobInfo })>
    {
        return settle(() => {
            let next: null | InMemoryJob = null;

            for (const job of this.jobs.values()) {
                if (job.task.type === type && job.lock === null) {
                    next = job;
                    break;
                }
            }

            if (next === null) {
                return null;
            }

            const token = randomUUID();

            next.lock = { token, timeout: this.createLockTimeout(next) };

            return {
                jobId: next.jobId,
                token,
                task: next.task,
                job: this.toJobInfo(next),
            };
        });
    }

    /**
     * When worker stops sending heartbeats, give job back to queue,
     * or fail it if it has been stalled too many times.
     */
    private createLockTimeout(job: InMemoryJob): NodeJS.Timeout
    {
        return setTimeout(() => {
            logger.notice('AI job stalled, worker did not send heartbeat', { jobId: job.jobId, type: job.task.type });
            job.lock = null;
            this.retryOrFail(job, 'Job stalled more than allowable limit');
        }, this.lockMs);
    }

    private retryOrFail(job: InMemoryJob, error: string): void
    {
        if (++job.attemptsMade < MAX_ATTEMPTS) {
            this.notifyAvailable(job.task.type);
            return;
        }

        this.jobs.delete(job.jobId);
        this.emitFailed(this.toJobInfo(job), error);
    }

    /**
     * @throws {StaleJobTokenError}
     */
    private getLockedJob(jobId: string, token: string): { job: InMemoryJob, lock: NonNullable<InMemoryJob['lock']> }
    {
        const job = this.jobs.get(jobId);

        if (!job || job.lock === null || job.lock.token !== token) {
            throw new StaleJobTokenError(`Job ${jobId} is not locked with this token`);
        }

        return { job, lock: job.lock };
    }

    heartbeat(jobId: string, token: string): Promise<void>
    {
        return settle(() => {
            const { job, lock } = this.getLockedJob(jobId, token);

            clearTimeout(lock.timeout);
            lock.timeout = this.createLockTimeout(job);
        });
    }

    complete(jobId: string, token: string, result: unknown): Promise<void>
    {
        return settle(() => {
            const { job, lock } = this.getLockedJob(jobId, token);

            clearTimeout(lock.timeout);
            this.jobs.delete(jobId);
            this.emitCompleted(this.toJobInfo(job), result);
        });
    }

    fail(jobId: string, token: string, error: string, retryable: boolean): Promise<void>
    {
        return settle(() => {
            const { job, lock } = this.getLockedJob(jobId, token);

            clearTimeout(lock.timeout);
            job.lock = null;

            if (!retryable) {
                job.attemptsMade = MAX_ATTEMPTS;
            }

            this.retryOrFail(job, error);
        });
    }

    getJob(jobId: string): Promise<null | AiJobInfo>
    {
        return settle(() => {
            const job = this.jobs.get(jobId);

            return job ? this.toJobInfo(job) : null;
        });
    }

    getCounts(type: AiJobType): Promise<{ waiting: number, active: number }>
    {
        return settle(() => {
            let waiting = 0;
            let active = 0;

            for (const job of this.jobs.values()) {
                if (job.task.type !== type) {
                    continue;
                }

                if (job.lock === null) {
                    ++waiting;
                } else {
                    ++active;
                }
            }

            return { waiting, active };
        });
    }

    drain(): Promise<void>
    {
        return settle(() => {
            for (const job of this.jobs.values()) {
                if (job.lock === null) {
                    this.jobs.delete(job.jobId);
                }
            }
        });
    }

    close(): Promise<void>
    {
        return settle(() => {
            for (const job of this.jobs.values()) {
                if (job.lock !== null) {
                    clearTimeout(job.lock.timeout);
                }
            }

            this.jobs.clear();
        });
    }

    private toJobInfo({ jobId, task, meta, expiresAt }: InMemoryJob): AiJobInfo
    {
        return { jobId, task, meta, expiresAt };
    }
}
