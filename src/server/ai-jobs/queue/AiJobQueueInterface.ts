import type { AiJobType, AiTask, ReservedJob } from '../protocol.js';

/**
 * Data attached to a job by the producer,
 * given back on job completion or failure.
 * Used to route result without relying on in-memory closures.
 */
export type AiJobMeta = { [key: string]: string | number | boolean | null };

export type AiJobInfo = {
    jobId: string;
    task: AiTask;
    meta: AiJobMeta;

    /**
     * Timestamp in ms. Job is not given anymore to workers after this date, and fails.
     */
    expiresAt: null | number;
};

export type SubmitOptions = {
    expiresAt: null | Date;

    meta?: AiJobMeta;
};

export type ReserveOptions = {
    /**
     * Max time to wait for a job, in ms. Returns null if no job came.
     */
    waitMs: number;

    /**
     * Stop waiting, i.e when worker http request is closed.
     */
    signal?: AbortSignal;
};

export type AiJobCompletedListener = (job: AiJobInfo, result: unknown) => void;

/**
 * Job failed and won't be retried.
 */
export type AiJobFailedListener = (job: AiJobInfo, error: string) => void;

/**
 * Thrown when a worker uses a token it does not own anymore
 * (job lock expired and job has been given to another worker, or job finished/removed).
 */
export class StaleJobTokenError extends Error {}

/**
 * Queues of AI jobs, one queue per job type (task.type).
 * Workers pull jobs with reserve(), keep them with heartbeat(),
 * then complete() or fail() them with the token received from reserve().
 */
export interface AiJobQueueInterface
{
    /**
     * Adds a job in the queue of its type (task.type), to be processed by a worker processing this job type.
     * Returns immediately, does not wait for the job to be processed:
     * result is emitted later to onCompleted() listeners, or error to onFailed() listeners,
     * along with job meta to know which request it answers.
     *
     * Jobs of a same type are given to workers oldest first.
     * If no worker reserved the job before expiresAt, job fails.
     *
     * @returns jobId, to cancel the job, or to match it in listeners.
     */
    submit(task: AiTask, options: SubmitOptions): Promise<string>;

    /**
     * Removes a job if not yet processed.
     * If already reserved by a worker, its result will still be emitted.
     *
     * @returns Whether job has been removed, false if already reserved or finished.
     */
    cancel(jobId: string): Promise<boolean>;

    /**
     * Returns next job to process among these job types, waits for one if queues are empty.
     * Job types are checked by priority order (see AI_JOB_TYPES),
     * so a worker processing moves and analyzes gets moves first.
     */
    reserve(types: AiJobType[], options: ReserveOptions): Promise<null | (ReservedJob & { job: AiJobInfo })>;

    /**
     * Extends job lock.
     *
     * @throws {StaleJobTokenError}
     */
    heartbeat(jobId: string, token: string): Promise<void>;

    /**
     * @throws {StaleJobTokenError}
     */
    complete(jobId: string, token: string, result: unknown): Promise<void>;

    /**
     * @param retryable Whether the job should be given again to a worker (worker crashed, invalid result...),
     *                  or definitively fail (task not processable, like unsupported board size).
     *
     * @throws {StaleJobTokenError}
     */
    fail(jobId: string, token: string, error: string, retryable: boolean): Promise<void>;

    /**
     * Get info of a job being processed, to validate its result.
     */
    getJob(jobId: string): Promise<null | AiJobInfo>;

    getCounts(type: AiJobType): Promise<{ waiting: number, active: number }>;

    /**
     * Removes all waiting jobs.
     * Called on server start: nobody is listening to their result anymore.
     */
    drain(): Promise<void>;

    onCompleted(listener: AiJobCompletedListener): void;

    onFailed(listener: AiJobFailedListener): void;

    close(): Promise<void>;
}

/**
 * Max times a job is given to a worker before definitively failing,
 * whatever the reason it came back (worker failed, stalled, disconnected).
 */
export const MAX_ATTEMPTS = 3;
