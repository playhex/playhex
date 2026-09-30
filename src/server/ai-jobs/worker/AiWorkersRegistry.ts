import { Service } from 'typedi';
import type { AiJobType } from '../protocol.js';

/**
 * A worker not seen since this duration is considered offline.
 * Workers are seen at least every LONG_POLL_MS when idle, every HEARTBEAT_MS when processing.
 */
const ONLINE_TIMEOUT_MS = 60_000;

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

    getOnlineWorkers(type?: AiJobType): AiWorkerState[]
    {
        const limit = Date.now() - ONLINE_TIMEOUT_MS;
        const online: AiWorkerState[] = [];

        for (const [mapKey, worker] of this.workers) {
            if (worker.lastSeenAt.getTime() < limit) {
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
