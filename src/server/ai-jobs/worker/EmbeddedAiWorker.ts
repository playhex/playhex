import { setTimeout } from 'node:timers/promises';
import type { AiJobQueueInterface } from '../queue/AiJobQueueInterface.js';
import { LONG_POLL_MS, type AiJobType, type AiTask, type ReservedJob } from '../protocol.js';
import logger from '../../services/logger.js';

/**
 * Process a task directly in this process.
 */
export type EmbeddedProcessor = (task: AiTask) => Promise<unknown>;

/**
 * Wait before reserving again after an error, i.e redis unreachable.
 */
const RETRY_AFTER_ERROR_MS = 5_000;

/**
 * Worker running in this process, pulling jobs from the queue like a remote worker.
 * Runs on the same event loop as the application, so only for lightweight engines (davies).
 */
export default class EmbeddedAiWorker
{
    private abortController = new AbortController();

    constructor(
        private queue: AiJobQueueInterface,
        readonly types: AiJobType[],
        private processor: EmbeddedProcessor,
    ) {}

    start(): void
    {
        void this.loop();
    }

    stop(): void
    {
        this.abortController.abort();
    }

    private async loop(): Promise<void>
    {
        const { signal } = this.abortController;

        while (!signal.aborted) {
            try {
                const reserved = await this.queue.reserve(this.types, { waitMs: LONG_POLL_MS, signal });

                if (reserved !== null) {
                    await this.process(reserved);
                }
            } catch (e) {
                logger.error('Embedded AI worker error', { types: this.types, message: e?.message });
                await setTimeout(RETRY_AFTER_ERROR_MS);
            }
        }
    }

    private async process({ jobId, token, task }: ReservedJob): Promise<void>
    {
        let result: unknown;

        try {
            result = await this.processor(task);
        } catch (e) {
            logger.error('Error while processing AI job in embedded worker', { jobId, type: task.type, message: e?.message });
            await this.queue.fail(jobId, token, e?.message ?? String(e), false);
            return;
        }

        await this.queue.complete(jobId, token, result);
    }
}
