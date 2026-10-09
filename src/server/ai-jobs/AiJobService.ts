import { Service } from 'typedi';
import type { AiJobInfo, AiJobQueueInterface } from './queue/AiJobQueueInterface.js';
import BullMqAiJobQueue from './queue/BullMqAiJobQueue.js';
import InMemoryAiJobQueue from './queue/InMemoryAiJobQueue.js';
import AiWorkersRegistry from './worker/AiWorkersRegistry.js';
import { processDavies } from './queue/localProcessors.js';
import { consolidateGameAnalyze, hasSwapMove, splitToAnalyzeMoveInputs, type AnalyzeGameRequest } from './gameAnalyze.js';
import type { AiJobType, AiTask, AnalyzeGameOutput, AnalyzeMoveInput, AnalyzeMoveOutput, AnalyzePositionInput, AnalyzePositionOutput, MoveOutput, MoveTask, SolvePositionInput, SolvePositionOutput } from './protocol.js';
import { MCTS_PLAYOUTS } from '../../shared/app/mctsSettings.js';
import { MOHEX_MAX_BOARDSIZE } from '../../shared/app/boardsizeLimits.js';
import type { AnalysisEngine } from '../../shared/app/hexplorer.js';
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
 * Max time to wait for a game analyze.
 * Game analyzes are background jobs, processed after bot moves and Hexplorer,
 * so they can wait long in queue when workers are busy.
 */
const ANALYZE_GAME_TIMEOUT_MS = 70 * 60_000;

/**
 * Max time to wait for a single move deep analyze, a player is waiting for it,
 * but tree search takes time and analyzes are processed after bot moves and Hexplorer.
 */
const ANALYZE_MOVE_MCTS_TIMEOUT_MS = 10 * 60_000;

/**
 * Max time to wait for a position solve.
 * Background job for puzzle check, processed after all others,
 * and children solves can take minutes (see SolvePositionInput.children.maxTimeSeconds).
 */
const SOLVE_POSITION_TIMEOUT_MS = 15 * 60_000;

/**
 * Same as SOLVE_POSITION_TIMEOUT_MS, when solving a position from puzzle editor:
 * user waits for it, and a new solve is requested each time another position is selected.
 */
export const SOLVE_POSITION_INTERACTIVE_TIMEOUT_MS = 2 * 60_000;

/**
 * Job type a worker must process to analyze Hexplorer positions with an engine.
 */
const ANALYSIS_ENGINE_JOB_TYPES: { [engine in AnalysisEngine]: AiJobType } = {
    'katahex-intuition': 'katahex-intuition-analyze-position',
    'katahex-mcts': 'katahex-mcts-analyze-position',
};

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

    if (task.type === 'mohex' && size > MOHEX_MAX_BOARDSIZE) {
        throw new AiJobError(`mohex cannot play on board size ${size}, max is ${MOHEX_MAX_BOARDSIZE}`);
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
     * Whether Hexplorer positions can be analyzed now with this engine.
     */
    isAnalysisEngineAvailable(engine: AnalysisEngine): boolean
    {
        return this.isJobTypeAvailable(ANALYSIS_ENGINE_JOB_TYPES[engine]);
    }

    /**
     * Whether positions can be solved now, see solvePosition().
     */
    isSolverAvailable(): boolean
    {
        return this.isJobTypeAvailable('mohex-solve-position');
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
     * Proves winner of a position, and of its children if requested, with Mohex solver.
     *
     * @throws {AiJobError}
     */
    async solvePosition(input: SolvePositionInput, timeoutMs = SOLVE_POSITION_TIMEOUT_MS): Promise<SolvePositionOutput>
    {
        if (input.size > MOHEX_MAX_BOARDSIZE) {
            throw new AiJobError(`mohex cannot solve on board size ${input.size}, max is ${MOHEX_MAX_BOARDSIZE}`);
        }

        return await this.submitAndWait({ type: 'mohex-solve-position', data: input }, timeoutMs) as SolvePositionOutput;
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
     * Analyze all moves of a game with katahex, in a single job.
     *
     * @returns Full analyze, or null if game has no move to analyze.
     *
     * @throws {AiJobError} If no worker processed it in time, or worker failed.
     */
    async analyzeGame(request: AnalyzeGameRequest, timeoutMs = ANALYZE_GAME_TIMEOUT_MS): Promise<null | GameAnalyzeData>
    {
        if (splitToAnalyzeMoveInputs(request).length === 0) {
            return null;
        }

        const outputs = await this.submitAndWait({
            type: 'katahex-intuition-analyze-game',
            data: request,
        }, timeoutMs) as AnalyzeGameOutput;

        const movesCount = request.movesHistory.split(' ').filter(move => move !== '').length;
        const results: (null | AnalyzeMoveOutput)[] = Array(movesCount).fill(null);

        for (const output of outputs) {
            results[output.moveIndex] = output;
        }

        return consolidateGameAnalyze(results, hasSwapMove(request));
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
        }
    }

    private onJobFailed(job: AiJobInfo, error: string): void
    {
        logger.warning('AI job failed', { jobId: job.jobId, type: job.task.type, error });

        const pendingJob = this.pendingJobs.get(job.jobId);

        if (pendingJob) {
            this.pendingJobs.delete(job.jobId);
            pendingJob.reject(new AiJobError(error));
        }
    }
}
