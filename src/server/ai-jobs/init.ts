import { setTimeout } from 'node:timers/promises';
import { Container } from 'typedi';
import AiJobService from './AiJobService.js';
import AiWorkersRegistry from './worker/AiWorkersRegistry.js';
import { AI_JOB_TYPES } from './protocol.js';
import { isMonitoringEnabled, sendAiQueuePoint } from '../services/metrics.js';
import GameAnalyzeRepository from '../repositories/GameAnalyzeRepository.js';
import ExternalGameRepository from '../external-games/ExternalGameRepository.js';
import { AppDataSource } from '../data-source.js';
import logger from '../services/logger.js';

const MONITOR_INTERVAL_MS = 30_000;

const monitorAiQueues = (): void => {
    const aiJobService = Container.get(AiJobService);
    const aiWorkersRegistry = Container.get(AiWorkersRegistry);

    setInterval(() => {
        for (const type of AI_JOB_TYPES) {
            aiJobService.queue.getCounts(type)
                .then(({ waiting, active }) => sendAiQueuePoint(type, waiting, active, aiWorkersRegistry.getOnlineWorkers(type).length))
                .catch(e => logger.warning('Could not get AI queue counts', { type, message: e?.message }))
            ;
        }
    }, MONITOR_INTERVAL_MS).unref();
};

/**
 * To call on server start.
 */
export const initAiJobs = async (): Promise<void> => {
    await Container.get(AiJobService).init();

    if (isMonitoringEnabled()) {
        monitorAiQueues();
    }

    while (!AppDataSource.isInitialized) {
        await setTimeout(100);
    }

    const failedCount = await Container.get(GameAnalyzeRepository).failUnfinished();

    if (failedCount > 0) {
        logger.notice(`${failedCount} game analyzes were processing before restart, marked as errored.`);
    }

    const failedExternalCount = await Container.get(ExternalGameRepository).failUnfinishedAnalyzes();

    if (failedExternalCount > 0) {
        logger.notice(`${failedExternalCount} external game analyzes were processing before restart, marked as errored.`);
    }
};
