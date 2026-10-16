import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { Express } from 'express';
import { Redis } from 'ioredis';
import { AI_JOB_TYPES } from '../ai-jobs/protocol.js';
import { getAiJobsRedisPrefix, isAiJobQueuePersisted } from '../ai-jobs/AiJobService.js';
import logger from './logger.js';
import { adminUiBasicAuth, requireAdminUiCredentials } from './security/adminUiBasicAuth.js';

export const BULL_BOARD_PATH = '/admin/bull-board';

/**
 * Monitor BullMQ queues (AI jobs), dashboard served on /admin/bull-board.
 * Enable it with BULL_BOARD_ENABLED=true in .env.
 * Requires REDIS_URL, else AI jobs are kept in memory and queues would always look empty.
 */
const initBullBoard = (app: Express): void => {
    if (process.env.BULL_BOARD_ENABLED !== 'true') {
        return;
    }

    requireAdminUiCredentials('bull-board');

    const { REDIS_URL } = process.env;

    if (!REDIS_URL) {
        logger.warning('bull-board not served: AI jobs are kept in memory, requires REDIS_URL.');
        return;
    }

    const connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    const prefix = getAiJobsRedisPrefix();

    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath(BULL_BOARD_PATH);

    createBullBoard({
        queues: AI_JOB_TYPES.map(type => new BullMQAdapter(new Queue(`ai-${type}`, { connection, prefix }))),
        serverAdapter,
    });

    app.use(BULL_BOARD_PATH, adminUiBasicAuth, serverAdapter.getRouter());
};

export const isBullBoardEnabled = (): boolean => process.env.BULL_BOARD_ENABLED === 'true' && isAiJobQueuePersisted();

export default initBullBoard;
