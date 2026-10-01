import { randomUUID } from 'node:crypto';
import { Service } from 'typedi';
import type { AiJobInfo, AiJobQueueInterface } from './queue/AiJobQueueInterface.js';
import BullMqAiJobQueue from './queue/BullMqAiJobQueue.js';
import InMemoryAiJobQueue from './queue/InMemoryAiJobQueue.js';
import AiWorkersRegistry from './worker/AiWorkersRegistry.js';
import { processDavies } from './queue/localProcessors.js';
import { consolidateGameAnalyze, hasSwapMove, splitToAnalyzeMoveInputs, type AnalyzeGameRequest } from './gameAnalyze.js';
import type { AiJobType, AiTask, AnalyzeMoveInput, AnalyzeMoveOutput, AnalyzePositionInput, AnalyzePositionOutput, MoveOutput, MoveTask } from './protocol.js';
import { MCTS_PLAYOUTS } from '../../shared/app/mctsSettings.js';
import type { GameAnalyzeData } from '../../shared/app/models/GameAnalyze.js';
import logger from '../services/logger.js';

/**
 * Max time to wait for a bot move, when bot clock remaining time is not known (i.e no time control).
 * After this time, job is cancelled if still waiting, and bot move fails (bot resigns),
 * even if a worker is still processing it: its result will be ignored.
 */
const DEFAULT_CALCULATE_MOVE_TIMEOUT_MS = 5 * 60_000;

/**
 * Max time to wait for a Hexplorer position analyze, a player is waiting for it.
 * Same behaviour as DEFAULT_CALCULATE_MOVE_TIMEOUT_MS.
 */
const ANALYZE_POSITION_TIMEOUT_MS = 2 * 60_000;

/**
 * Max time a game analyze move job can wait in queue before a worker takes it, else this move analyze fails.
 * Analyze moves are background jobs, processed after bot moves and Hexplorer,
 * so they can wait long when workers are busy.
 * Not a processing time limit: once taken by a worker, job is kept as long as worker sends heartbeats.
 */
const ANALYZE_MOVE_TIMEOUT_MS = 60 * 60_000;

/**
 * After ANALYZE_MOVE_TIMEOUT_MS, time let to workers to finish move analyzes they are processing.
 * Then game analyze ends with moves analyzed so far, even if some jobs are still in queue
 * (i.e job given back to queue after its worker stopped, and no worker left to take it).
 */
const ANALYZE_MOVE_PROCESSING_GRACE_MS = 10 * 60_000;

/**
 * Max time to wait for a single move deep analyze, a player is waiting for it,
 * but tree search takes time and analyzes are processed after bot moves and Hexplorer.
 */
const ANALYZE_MOVE_MCTS_TIMEOUT_MS = 10 * 60_000;

/**
 * Error from AI job: task invalid, no worker processed it in time, or worker failed.
 */
export class AiJobError extends Error {}

/**
 * Check task can be processed by the engine, to not send a task that cannot be processed.
 *
 * @throws {AiJobError}
 */
const checkTask = (task: MoveTask): void => {
    const { size } = task.data.game;

    if (task.type === 'mohex' && size > 14) {
        throw new AiJobError(`mohex cannot play on board size ${size}, max is 14`);
    }

    if (task.type === 'davies' && size !== 11) {
        throw new AiJobError(`davies cannot play on board size ${size}, only 11`);
    }
};

export const getAiJobsRedisPrefix = (): string => (process.env.REDIS_PREFIX ?? 'hex') + '-ai-jobs';

/**
 * In production, jobs are kept in redis, with bullmq handling locks and stalled jobs.
 * In development, jobs are kept in memory, and davies moves are calculated locally, without worker.
 *
 * Only works with a single hex instance: job results are emitted in the process that received them,
 * connected workers are tracked in memory, and waiting jobs are drained on start.
 */
export const createAiJobQueue = (): AiJobQueueInterface => {
    const { NODE_ENV, REDIS_URL } = process.env;

    if (NODE_ENV === 'production' && REDIS_URL) {
        return new BullMqAiJobQueue(REDIS_URL, getAiJobsRedisPrefix());
    }

    logger.info('AI jobs are kept in memory. Davies moves are calculated locally, other engines need a worker.');

    return new InMemoryAiJobQueue({
        davies: processDavies,
    });
};

type PendingJob = {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
};

/**
 * Game analyze being processed, results are kept in memory until all moves are analyzed.
 * Lost on restart.
 */
type PendingAnalyze = {
    results: (null | AnalyzeMoveOutput)[];
    swapped: boolean;

    /**
     * Number of move analyzes not yet completed or failed.
     */
    remaining: number;

    /**
     * Whether at least one move has been analyzed.
     */
    hasResult: boolean;

    onProgress: (analyze: GameAnalyzeData) => void;
    resolve: (analyze: null | GameAnalyzeData) => void;
};

/**
 * Sends AI tasks (bot moves, analyzes) to AI workers through the job queue.
 */
@Service()
export default class AiJobService
{
    /**
     * Created on first use, see queue getter.
     */
    private aiJobQueue: null | AiJobQueueInterface = null;

    /**
     * Jobs of which a caller is waiting the result (bot moves, Hexplorer), by jobId.
     * Resolved or rejected when queue emits job completed or failed.
     * Kept in memory: a result coming after a restart has no pending job and is ignored.
     */
    private pendingJobs = new Map<string, PendingJob>();

    /**
     * Game analyzes being processed, by analyzeId (set in meta of each analyze move job).
     * Accumulates move analyzes results until all moves are done.
     */
    private pendingAnalyzes = new Map<string, PendingAnalyze>();

    /**
     * Resolved once jobs from before restart are drained, see init().
     * Jobs are submitted only after, else they would be drained.
     */
    private ready: Promise<void> = Promise.resolve();

    /**
     * @param aiWorkersRegistry Connected workers, to know which job types can be processed now.
     */
    constructor(
        private aiWorkersRegistry: AiWorkersRegistry,
    ) {}

    /**
     * Created on first use, to not connect to redis when not used, i.e in commands.
     */
    get queue(): AiJobQueueInterface
    {
        if (this.aiJobQueue === null) {
            this.aiJobQueue = createAiJobQueue();

            this.aiJobQueue.onCompleted((job, result) => this.onJobCompleted(job, result));
            this.aiJobQueue.onFailed((job, error) => this.onJobFailed(job, error));
        }

        return this.aiJobQueue;
    }

    /**
     * To call on server start.
     * Jobs submitted before a restart are removed, nobody is listening to their result anymore.
     */
    init(): Promise<void>
    {
        this.ready = this.queue.drain()
            .catch(e => {
                logger.error('Could not drain AI jobs queue', { message: e?.message });
            })
        ;

        return this.ready;
    }

    /**
     * Whether a job of this type can be processed now:
     * a remote worker processing this job type is connected, or job type is processed locally.
     */
    isJobTypeAvailable(type: AiJobType): boolean
    {
        if (this.queue instanceof InMemoryAiJobQueue && this.queue.hasLocalProcessor(type)) {
            return true;
        }

        return this.aiWorkersRegistry.getOnlineWorkers(type).length > 0;
    }

    /**
     * @param timeoutMs Max time to wait for a worker to process the move, i.e remaining time on bot clock.
     *
     * @throws {AiJobError}
     */
    async calculateMove(task: MoveTask, timeoutMs = DEFAULT_CALCULATE_MOVE_TIMEOUT_MS): Promise<MoveOutput>
    {
        checkTask(task);

        return await this.submitAndWait(task, timeoutMs) as MoveOutput;
    }

    /**
     * @param mcts Whether to use tree search, with MCTS_PLAYOUTS, instead of raw neural network output.
     *
     * @throws {AiJobError}
     */
    async analyzePosition(input: AnalyzePositionInput, mcts = false): Promise<AnalyzePositionOutput>
    {
        const task: AiTask = mcts
            ? { type: 'katahex-mcts-analyze-position', data: { ...input, maxPlayouts: MCTS_PLAYOUTS } }
            : { type: 'katahex-intuition-analyze-position', data: input }
        ;

        return await this.submitAndWait(task, ANALYZE_POSITION_TIMEOUT_MS) as AnalyzePositionOutput;
    }

    /**
     * Analyze a single move of a game with tree search, with MCTS_PLAYOUTS.
     *
     * @throws {AiJobError}
     */
    async analyzeMoveMcts(input: AnalyzeMoveInput): Promise<AnalyzeMoveOutput>
    {
        return await this.submitAndWait({
            type: 'katahex-mcts-analyze-move',
            data: { ...input, maxPlayouts: MCTS_PLAYOUTS },
        }, ANALYZE_MOVE_MCTS_TIMEOUT_MS) as AnalyzeMoveOutput;
    }

    /**
     * Analyze all moves of a game with katahex, moves are analyzed in parallel.
     *
     * @param onProgress Called each time a move has been analyzed, with the partial analyze (not yet analyzed moves are null).
     * @param timeoutMs Max time a move analyze can wait for a worker, else it fails.
     * @param processingGraceMs After timeoutMs, time let to workers to finish move analyzes being processed,
     *                          then game analyze ends anyway.
     *
     * @returns Full analyze. Moves that failed are null. Null if all moves failed.
     *
     * @throws {AiJobError} If moves could not be submitted.
     */
    async analyzeGame(request: AnalyzeGameRequest, onProgress: (analyze: GameAnalyzeData) => void, timeoutMs = ANALYZE_MOVE_TIMEOUT_MS, processingGraceMs = ANALYZE_MOVE_PROCESSING_GRACE_MS): Promise<null | GameAnalyzeData>
    {
        const inputs = splitToAnalyzeMoveInputs(request);

        if (inputs.length === 0) {
            return null;
        }

        const movesCount = request.movesHistory.split(' ').filter(move => move !== '').length;
        // Not an incremental id: jobs still processed from before a restart must not match a new analyze
        const analyzeId = randomUUID();
        const { promise, resolve } = Promise.withResolvers<null | GameAnalyzeData>();

        this.pendingAnalyzes.set(analyzeId, {
            results: Array(movesCount).fill(null),
            swapped: hasSwapMove(request),
            remaining: inputs.length,
            hasResult: false,
            onProgress,
            resolve,
        });

        await this.ready;

        const expiresAt = new Date(Date.now() + timeoutMs);
        const submitted = await Promise.allSettled(inputs.map(input => this.queue.submit({ type: 'katahex-intuition-analyze-move', data: input }, {
            expiresAt,
            meta: { analyzeId },
        })));

        const jobIds = submitted.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
        const submitError = submitted.find(result => result.status === 'rejected');

        if (submitError) {
            this.pendingAnalyzes.delete(analyzeId);
            await Promise.allSettled(jobIds.map(jobId => this.queue.cancel(jobId)));

            throw new AiJobError(`Could not submit game analyze: ${submitError.reason?.message}`);
        }

        // Queue only checks expiration when a worker takes the job,
        // also fail move analyzes that no worker took in time.
        const timeout = setTimeout(() => {
            for (const jobId of jobIds) {
                this.queue.cancel(jobId)
                    .then(cancelled => {
                        if (cancelled) {
                            this.onAnalyzeMoveFinished(analyzeId, null);
                        }
                    })
                    .catch(e => logger.warning('Could not cancel expired analyze move job', { jobId, message: e?.message }))
                ;
            }
        }, timeoutMs);

        // Do not wait forever a move analyze that no worker will process,
        // ignore results coming after.
        const deadline = setTimeout(() => {
            if (!this.pendingAnalyzes.has(analyzeId)) {
                return;
            }

            logger.warning('Game analyze not fully processed in time, ending it with moves analyzed so far', { analyzeId });

            for (const jobId of jobIds) {
                void this.queue.cancel(jobId).catch(() => {});
            }

            this.endAnalyze(analyzeId);
        }, timeoutMs + processingGraceMs);

        try {
            return await promise;
        } finally {
            clearTimeout(timeout);
            clearTimeout(deadline);
        }
    }

    private async submitAndWait(task: AiTask, timeoutMs: number): Promise<unknown>
    {
        await this.ready;

        const jobId = await this.queue.submit(task, {
            expiresAt: new Date(Date.now() + timeoutMs),
        });

        const { promise, resolve, reject } = Promise.withResolvers<unknown>();

        this.pendingJobs.set(jobId, { resolve, reject });

        // Queue only checks expiration when a worker takes the job,
        // also stop waiting if no worker takes it.
        const timeout = setTimeout(() => {
            if (!this.pendingJobs.has(jobId)) {
                return;
            }

            this.pendingJobs.delete(jobId);
            void this.queue.cancel(jobId);
            reject(new AiJobError(`No worker processed "${task.type}" in time`));
        }, timeoutMs);

        try {
            return await promise;
        } finally {
            clearTimeout(timeout);
        }
    }

    private onJobCompleted(job: AiJobInfo, result: unknown): void
    {
        const pendingJob = this.pendingJobs.get(job.jobId);

        if (pendingJob) {
            this.pendingJobs.delete(job.jobId);
            pendingJob.resolve(result);
            return;
        }

        if (job.task.type === 'katahex-intuition-analyze-move') {
            this.onAnalyzeMoveFinished(String(job.meta.analyzeId), result as AnalyzeMoveOutput);
        }
    }

    private onJobFailed(job: AiJobInfo, error: string): void
    {
        logger.warning('AI job failed', { jobId: job.jobId, type: job.task.type, error });

        const pendingJob = this.pendingJobs.get(job.jobId);

        if (pendingJob) {
            this.pendingJobs.delete(job.jobId);
            pendingJob.reject(new AiJobError(error));
            return;
        }

        if (job.task.type === 'katahex-intuition-analyze-move') {
            this.onAnalyzeMoveFinished(String(job.meta.analyzeId), null);
        }
    }

    private onAnalyzeMoveFinished(analyzeId: string, result: null | AnalyzeMoveOutput): void
    {
        const pendingAnalyze = this.pendingAnalyzes.get(analyzeId);

        // Analyze requested before a restart, ignore result
        if (!pendingAnalyze) {
            return;
        }

        --pendingAnalyze.remaining;

        if (result !== null) {
            pendingAnalyze.results[result.moveIndex] = result;
            pendingAnalyze.hasResult = true;
        }

        if (pendingAnalyze.remaining === 0) {
            this.endAnalyze(analyzeId);
            return;
        }

        if (result !== null) {
            try {
                pendingAnalyze.onProgress(consolidateGameAnalyze(pendingAnalyze.results, pendingAnalyze.swapped));
            } catch (e) {
                logger.error('Error in game analyze progress listener', { message: e?.message });
            }
        }
    }

    /**
     * Resolve game analyze with moves analyzed so far, or null if none.
     */
    private endAnalyze(analyzeId: string): void
    {
        const pendingAnalyze = this.pendingAnalyzes.get(analyzeId);

        if (!pendingAnalyze) {
            return;
        }

        this.pendingAnalyzes.delete(analyzeId);
        pendingAnalyze.resolve(pendingAnalyze.hasResult
            ? consolidateGameAnalyze(pendingAnalyze.results, pendingAnalyze.swapped)
            : null,
        );
    }
}
