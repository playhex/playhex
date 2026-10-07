import { setTimeout as sleep } from 'node:timers/promises';
import { Service } from 'typedi';
import { ExternalGameImportJob } from '../../shared/app/models/index.js';
import { errorToLogger } from '../../shared/app/utils.js';
import { AppDataSource } from '../data-source.js';
import logger from '../services/logger.js';
import { isDuplicateError } from '../repositories/typeormUtils.js';
import ExternalGameRepository from './ExternalGameRepository.js';
import LittleGolemClient from '../../shared/app/little-golem/LittleGolemClient.js';
import { parsePlayerGameList } from './little-golem/littleGolemParsers.js';
import { createExternalGameFromLittleGolem } from './little-golem/littleGolemExternalGame.js';
import { littleGolemGameExternalId } from '../../shared/app/little-golem/littleGolemUtils.js';
import { LittleGolemGameNotFinishedError } from '../../shared/app/little-golem/littleGolemHsgf.js';

/**
 * Check for new jobs at this interval, if not woken up before.
 */
const IDLE_CHECK_INTERVAL = 30_000;

/**
 * Persist job progress every N processed games.
 */
const PERSIST_PROGRESS_EVERY = 5;

/**
 * Processes import jobs one by one, in background, in this process.
 * Jobs are persisted, so jobs interrupted by a restart are processed again
 * (already imported games are then skipped).
 */
@Service()
export default class ExternalGameImportWorker
{
    private started = false;

    private wakeUp: null | (() => void) = null;

    constructor(
        private externalGameRepository: ExternalGameRepository,
        private littleGolemClient: LittleGolemClient,
    ) {}

    static isEnabled(): boolean
    {
        return process.env.EXTERNAL_GAME_IMPORT === 'true';
    }

    /**
     * Process new job now if idle.
     */
    notifyNewJob(): void
    {
        this.wakeUp?.();
    }

    start(): void
    {
        if (this.started) {
            return;
        }

        this.started = true;

        this.loop().catch(e => {
            logger.error('External game import worker stopped', errorToLogger(e));
            this.started = false;
        });
    }

    private async loop(): Promise<void>
    {
        while (!AppDataSource.isInitialized) {
            await sleep(100);
        }

        const resetCount = await this.externalGameRepository.resetRunningImportJobs();

        if (resetCount > 0) {
            logger.notice(`${resetCount} external game imports were running before restart, will be processed again.`);
        }

        while (true) {
            let job: null | ExternalGameImportJob = null;

            try {
                job = await this.externalGameRepository.findNextPendingImportJob();
            } catch (e) {
                logger.error('Could not fetch next external game import job', errorToLogger(e));
            }

            if (job === null) {
                await new Promise<void>(resolve => {
                    const timeout = setTimeout(resolve, IDLE_CHECK_INTERVAL);

                    this.wakeUp = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                });

                this.wakeUp = null;
                continue;
            }

            try {
                await this.processJob(job);
            } catch (e) {
                // i.e job could not be marked as running, wait before retrying to not loop on a database error
                logger.error('Could not process external game import job', { jobId: job.publicId, ...errorToLogger(e) });
                await sleep(IDLE_CHECK_INTERVAL);
            }
        }
    }

    private async processJob(job: ExternalGameImportJob): Promise<void>
    {
        logger.info('Start external game import', { jobId: job.publicId, source: job.source, externalPlayerId: job.externalPlayerId });

        job.status = 'running';
        job.startedAt = new Date();
        job.endedAt = null;
        job.lastError = null;

        await this.externalGameRepository.saveImportJob(job);

        try {
            switch (job.source) {
                case 'LG':
                    await this.importLittleGolemGames(job);
                    break;

                default:
                    throw new Error(`Unsupported import source: "${job.source as string}"`);
            }

            job.status = 'done';
        } catch (e) {
            logger.warning('External game import failed', { jobId: job.publicId, ...errorToLogger(e) });

            job.status = 'failed';
            job.lastError = String((e as Error)?.message ?? e).substring(0, 255);
        }

        job.endedAt = new Date();

        try {
            await this.externalGameRepository.saveImportJob(job);
        } catch (e) {
            logger.error('Could not persist external game import job result', { jobId: job.publicId, ...errorToLogger(e) });
        }

        logger.info('End external game import', {
            jobId: job.publicId,
            status: job.status,
            totalGames: job.totalGames,
            importedGames: job.importedGames,
            skippedGames: job.skippedGames,
            failedGames: job.failedGames,
            notFinishedGames: job.notFinishedGames,
        });
    }

    private async importLittleGolemGames(job: ExternalGameImportJob): Promise<void>
    {
        const plid = parseInt(job.externalPlayerId, 10);
        const gids = parsePlayerGameList(await this.littleGolemClient.fetchPlayerGameList(plid));
        const existing = await this.externalGameRepository.findExistingExternalIds(gids.map(littleGolemGameExternalId));
        const gidsToImport = gids.filter(gid => !existing.has(littleGolemGameExternalId(gid)));

        job.totalGames = gids.length;
        job.importedGames = 0;
        job.skippedGames = gids.length - gidsToImport.length;
        job.failedGames = 0;
        job.notFinishedGames = 0;

        await this.externalGameRepository.saveImportJob(job);

        let processed = 0;

        for (const gid of gidsToImport) {
            try {
                const hsgf = await this.littleGolemClient.fetchGameHsgf(gid);
                const gamePage = await this.littleGolemClient.fetchGamePage(gid);
                const externalGame = createExternalGameFromLittleGolem(gid, hsgf, gamePage);

                externalGame.createdBy = job.requestedBy;

                await this.externalGameRepository.save(externalGame);

                ++job.importedGames;
            } catch (e) {
                // Imported meanwhile, i.e by the opponent
                if (isDuplicateError(e)) {
                    ++job.skippedGames;
                } else if (e instanceof LittleGolemGameNotFinishedError) {
                    ++job.notFinishedGames;
                } else {
                    logger.notice('Could not import a Little Golem game', { gid, ...errorToLogger(e) });
                    ++job.failedGames;
                    job.lastError = `Game ${gid}: ${String((e as Error)?.message ?? e)}`.substring(0, 255);
                }
            }

            if (++processed % PERSIST_PROGRESS_EVERY === 0) {
                await this.externalGameRepository.saveImportJob(job);
            }
        }
    }
}

