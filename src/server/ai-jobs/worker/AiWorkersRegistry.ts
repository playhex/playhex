import { Service } from 'typedi';
import { TypedEmitter } from 'tiny-typed-emitter';
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

interface AiWorkersRegistryEvents
{
    /**
     * A worker connected or disconnected.
     * Not emitted when a worker times out, this is only noticed on next getOnlineWorkers().
     */
    workersChanged: () => void;
}

/**
 * Keeps track of remote workers currently connected, in memory.
 */
@Service()
export default class AiWorkersRegistry extends TypedEmitter<AiWorkersRegistryEvents>
{
    /**
     * Keyed by keyId and workerId, a worker could otherwise pretend to be a worker of another key.
     */
    private workers = new Map<string, AiWorkerState>();

    seen(keyId: number, workerId: string, types: AiJobType[], jobId: null | string): void
    {
        const mapKey = `${keyId}:${workerId}`;
        const isNew = !this.workers.has(mapKey);

        this.workers.set(mapKey, {
            workerId,
            keyId,
            types,
            lastSeenAt: new Date(),
            jobId,
        });

        if (isNew) {
            this.emit('workersChanged');
        }
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
        if (this.workers.delete(`${keyId}:${workerId}`)) {
            this.emit('workersChanged');
        }
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
