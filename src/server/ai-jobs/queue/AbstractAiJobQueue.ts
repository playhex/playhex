import { EventEmitter } from 'node:events';
import type { AiJobCompletedListener, AiJobFailedListener, AiJobInfo, AiJobQueueInterface, ReserveOptions, SubmitOptions } from './AiJobQueueInterface.js';
import { AI_JOB_TYPES, type AiJobType, type AiTask, type ReservedJob } from '../protocol.js';
import logger from '../../services/logger.js';

/**
 * While a worker waits for a job, also check queue at this interval,
 * in case a job became available without being notified (i.e stalled job moved back to waiting).
 */
const POLL_FALLBACK_MS = 2000;

/**
 * Common logic of queue implementations:
 * long-polling, expired jobs, completed and failed listeners.
 */
export default abstract class AbstractAiJobQueue implements AiJobQueueInterface
{
    private emitter = new EventEmitter();

    constructor()
    {
        // One listener per waiting worker
        this.emitter.setMaxListeners(0);
    }

    abstract submit(task: AiTask, options: SubmitOptions): Promise<string>;
    abstract cancel(jobId: string): Promise<boolean>;
    abstract heartbeat(jobId: string, token: string): Promise<void>;
    abstract complete(jobId: string, token: string, result: unknown): Promise<void>;
    abstract fail(jobId: string, token: string, error: string, retryable: boolean): Promise<void>;
    abstract getJob(jobId: string): Promise<null | AiJobInfo>;
    abstract getCounts(type: AiJobType): Promise<{ waiting: number, active: number }>;
    abstract drain(): Promise<void>;
    abstract close(): Promise<void>;

    /**
     * Take next job from the queue of this job type if any, without waiting.
     */
    protected abstract tryReserve(type: AiJobType): Promise<null | (ReservedJob & { job: AiJobInfo })>;

    async reserve(types: AiJobType[], { waitMs, signal }: ReserveOptions): Promise<null | (ReservedJob & { job: AiJobInfo })>
    {
        const deadline = Date.now() + waitMs;
        const typesByPriority = AI_JOB_TYPES.filter(type => types.includes(type));

        while (!signal?.aborted) {
            const reserved = await this.tryReserveFirst(typesByPriority);

            if (reserved !== null) {
                return reserved;
            }

            const remaining = deadline - Date.now();

            if (remaining <= 0) {
                break;
            }

            await this.waitAvailable(typesByPriority, Math.min(remaining, POLL_FALLBACK_MS), signal);
        }

        return null;
    }

    /**
     * Take a job from first non-empty queue. Expired jobs are failed and skipped.
     */
    private async tryReserveFirst(typesByPriority: AiJobType[]): Promise<null | (ReservedJob & { job: AiJobInfo })>
    {
        for (const type of typesByPriority) {
            let reserved: null | (ReservedJob & { job: AiJobInfo });

            while ((reserved = await this.tryReserve(type)) !== null) {
                if (reserved.job.expiresAt === null || reserved.job.expiresAt >= Date.now()) {
                    return reserved;
                }

                logger.info('AI job expired before being processed', { jobId: reserved.jobId, type });
                await this.fail(reserved.jobId, reserved.token, 'Job expired before being processed', false);
            }
        }

        return null;
    }

    /**
     * Resolves when a job of one of these types is submitted, or after ms, or on abort.
     */
    private waitAvailable(types: AiJobType[], ms: number, signal?: AbortSignal): Promise<void>
    {
        const timeoutSignal = AbortSignal.timeout(ms);
        const stopSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

        return new Promise(resolve => {
            const onAvailable = (type: AiJobType): void => {
                if (types.includes(type)) {
                    done();
                }
            };

            const done = (): void => {
                this.emitter.off('available', onAvailable);
                stopSignal.removeEventListener('abort', done);
                resolve();
            };

            if (stopSignal.aborted) {
                resolve();
                return;
            }

            this.emitter.on('available', onAvailable);
            stopSignal.addEventListener('abort', done);
        });
    }

    /**
     * Wake up workers waiting for a job of this type.
     */
    protected notifyAvailable(type: AiJobType): void
    {
        this.emitter.emit('available', type);
    }

    protected emitCompleted(job: AiJobInfo, result: unknown): void
    {
        this.emitter.emit('completed', job, result);
    }

    protected emitFailed(job: AiJobInfo, error: string): void
    {
        this.emitter.emit('failed', job, error);
    }

    onCompleted(listener: AiJobCompletedListener): void
    {
        this.emitter.on('completed', listener);
    }

    onFailed(listener: AiJobFailedListener): void
    {
        this.emitter.on('failed', listener);
    }
}
