import { Container } from 'typedi';
import AiJobService from './AiJobService.js';
import AiWorkersRegistry from './worker/AiWorkersRegistry.js';
import monitorAiQueues from './monitorAiQueues.js';
import { isMonitoringEnabled } from '../services/metrics.js';
import GameAnalyzeRepository from '../repositories/GameAnalyzeRepository.js';
import ExternalGameRepository from '../external-games/ExternalGameRepository.js';
import { appDataSourceInitialized } from '../data-source.js';
import logger from '../services/logger.js';

/**
 * To call on server start.
 */
export const initAiJobs = async (): Promise<void> => {
    const aiJobService = Container.get(AiJobService);

    await aiJobService.init();
    aiJobService.startEmbeddedWorkers();

    if (isMonitoringEnabled()) {
        monitorAiQueues(aiJobService.queue, Container.get(AiWorkersRegistry));
    }

    await appDataSourceInitialized;

    const failedCount = await Container.get(GameAnalyzeRepository).failUnfinished();

    if (failedCount > 0) {
        logger.notice(`${failedCount} game analyzes were processing before restart, marked as errored.`);
    }

    const failedExternalCount = await Container.get(ExternalGameRepository).failUnfinishedAnalyzes();

    if (failedExternalCount > 0) {
        logger.notice(`${failedExternalCount} external game analyzes were processing before restart, marked as errored.`);
    }
};
