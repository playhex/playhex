import type { AiJobQueueInterface } from './queue/AiJobQueueInterface.js';
import type AiWorkersRegistry from './worker/AiWorkersRegistry.js';
import { AI_JOB_TYPES } from './protocol.js';
import { sendAiQueuePoint, sendAiQueueStatePoint, sendAiWorkersConnectedPoint } from '../services/metrics.js';
import logger from '../services/logger.js';

/**
 * Wait a bit after an event before reading counts, to send a single point for several events,
 * and to not show a peak when a job is immediately taken by an idle worker.
 */
const EVENTS_GROUPING_MS = 100;

/**
 * Some changes emit no event, like a worker timing out without closing its connection.
 */
const CHECK_INTERVAL_MS = 30_000;

/**
 * Sends AI queues and workers metrics when they change.
 */
const monitorAiQueues = (queue: AiJobQueueInterface, aiWorkersRegistry: AiWorkersRegistry): void => {
    const lastSent = new Map<string, string>();

    const hasChanged = (metric: string, values: number[]): boolean => {
        const serialized = values.join();

        if (lastSent.get(metric) === serialized) {
            return false;
        }

        lastSent.set(metric, serialized);

        return true;
    };

    const sendChanges = async (): Promise<void> => {
        const workersOnline = aiWorkersRegistry.getOnlineWorkers().length;

        // Before reading queues: must still be sent when redis is unreachable
        if (hasChanged('workers', [workersOnline])) {
            sendAiWorkersConnectedPoint(workersOnline);
        }

        const counts = await Promise.all(AI_JOB_TYPES.map(async type => ({
            type,
            ...await queue.getCounts(type),
        })));

        for (const { type, waiting, active } of counts) {
            const typeWorkersOnline = aiWorkersRegistry.getOnlineWorkers(type).length;

            if (hasChanged(type, [waiting, active, typeWorkersOnline])) {
                sendAiQueuePoint(type, waiting, active, typeWorkersOnline);
            }
        }

        const totalWaiting = counts.reduce((sum, { waiting }) => sum + waiting, 0);
        const totalActive = counts.reduce((sum, { active }) => sum + active, 0);

        if (hasChanged('total', [totalWaiting, totalActive])) {
            sendAiQueueStatePoint(totalWaiting, totalActive);
        }
    };

    let isScheduled = false;
    let lastSending = Promise.resolve();

    const scheduleSendChanges = (): void => {
        if (isScheduled) {
            return;
        }

        isScheduled = true;

        setTimeout(() => {
            isScheduled = false;

            // One after the other, so that an older reading cannot be sent after a newer one
            lastSending = lastSending
                .then(sendChanges)
                .catch(e => {
                    logger.warning('Could not send AI queues metrics', { message: e?.message });
                })
            ;
        }, EVENTS_GROUPING_MS).unref();
    };

    queue.onCountsChanged(scheduleSendChanges);
    aiWorkersRegistry.on('workersChanged', scheduleSendChanges);
    setInterval(scheduleSendChanges, CHECK_INTERVAL_MS).unref();
};

export default monitorAiQueues;
