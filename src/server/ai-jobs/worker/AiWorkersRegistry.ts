import { Service } from 'typedi';
import { LOCK_MS, LONG_POLL_MS, type AiJobType } from '../protocol.js';

/**
 * An idle worker not seen since this duration is considered offline.
 * Idle workers are seen each time they request next job, at least every LONG_POLL_MS,
 * plus a margin for the worker to send a new request.
 */
const IDLE_ONLINE_TIMEOUT_MS = LONG_POLL_MS + 5_000;

/**
 * A worker processing a job is considered offline when it stops sending heartbeats,
 * at the same time its job is given to another worker.
 */
const BUSY_ONLINE_TIMEOUT_MS = LOCK_MS;

export type AiWorkerState = {
    workerId: string;
    keyId: number;

    /**
     * Job types this worker processes.
     */
    types: AiJobType[];

    lastSeenAt: Date;

    /**
     * Job being processed, if any.
     */
    jobId: null | string;
};

/**
 * Keeps track of remote workers currently connected, in memory.
 */
@Service()
export default class AiWorkersRegistry
{
    /**
     * Keyed by keyId and workerId, a worker could otherwise pretend to be a worker of another key.
     */
    private workers = new Map<string, AiWorkerState>();

    seen(keyId: number, workerId: string, types: AiJobType[], jobId: null | string): void
    {
        this.workers.set(`${keyId}:${workerId}`, {
            workerId,
            keyId,
            types,
            lastSeenAt: new Date(),
            jobId,
        });
    }

    /**
     * Update worker processing state without knowing its job types (on heartbeat, result).
     */
    setJob(keyId: number, workerId: string, jobId: null | string): void
    {
        const worker = this.workers.get(`${keyId}:${workerId}`);

        if (worker) {
            worker.lastSeenAt = new Date();
            worker.jobId = jobId;
        }
    }

    /**
     * Worker disconnected: closed its connection while waiting for a job, or stopped.
     */
    remove(keyId: number, workerId: string): void
    {
        this.workers.delete(`${keyId}:${workerId}`);
    }

    getOnlineWorkers(type?: AiJobType): AiWorkerState[]
    {
        const now = Date.now();
        const online: AiWorkerState[] = [];

        for (const [mapKey, worker] of this.workers) {
            const timeoutMs = worker.jobId === null ? IDLE_ONLINE_TIMEOUT_MS : BUSY_ONLINE_TIMEOUT_MS;

            if (worker.lastSeenAt.getTime() < now - timeoutMs) {
                this.workers.delete(mapKey);
                continue;
            }

            if (type === undefined || worker.types.includes(type)) {
                online.push(worker);
            }
        }

        return online;
    }
}
