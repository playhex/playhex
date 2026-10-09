import { createHash } from 'node:crypto';
import { Service } from 'typedi';
import type { AnalysisEngine } from '../../shared/app/hexplorer.js';
import type { PuzzleDefinition } from '../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleCheckEngine, PuzzleCheckState, PuzzleCheckWarning } from '../../shared/app/puzzles/puzzleCheck.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import PositionSolveCache from '../ai-jobs/PositionSolveCache.js';
import { checkPuzzleWithKatahex } from './PuzzleKatahexChecker.js';
import { checkPuzzleWithSolver } from './PuzzleSolverChecker.js';
import logger from '../services/logger.js';

/**
 * How long a finished check is kept, for client polling.
 * Running it again later is fast anyway, as analyzes are cached by position.
 */
const FINISHED_RUN_TTL_MS = 10 * 60_000;

/**
 * Identifies a check: same puzzle position and tree, with same engine.
 * Messages and texts are ignored, they don't change the check.
 */
export const getPuzzleCheckKey = (puzzle: PuzzleDefinition, engine: PuzzleCheckEngine): string => {
    const definition = {
        boardsize: puzzle.boardsize,
        redStones: [...puzzle.redStones].sort(),
        blueStones: [...puzzle.blueStones].sort(),
        disabledCells: [...puzzle.disabledCells ?? []].sort(),
        playerColor: puzzle.playerColor,
        tree: puzzle.tree,
    };

    const json = JSON.stringify(definition, (key, value: unknown) => key === 'message' ? undefined : value);

    return createHash('sha1').update(engine + '|' + json).digest('hex');
};

/**
 * Runs puzzle katahex checks in background, as they can take long (many positions to analyze),
 * and keeps their state in memory for client polling.
 */
@Service()
export default class PuzzleCheckService
{
    private runs = new Map<string, PuzzleCheckState>();

    constructor(
        private aiJobService: AiJobService,
        private positionAnalysisCache: PositionAnalysisCache,
        private positionSolveCache: PositionSolveCache,
    ) {}

    /**
     * Current state of a check, or null if not started, or expired.
     * A failed check is returned once, then forgotten so it can be started again.
     */
    getState(key: string): null | PuzzleCheckState
    {
        const state = this.runs.get(key) ?? null;

        if (state?.status === 'failed') {
            this.runs.delete(key);
        }

        return state;
    }

    /**
     * Whether a check can be run now with this engine.
     */
    isEngineAvailable(engine: PuzzleCheckEngine): boolean
    {
        if (engine === 'mohex-solver') {
            return this.aiJobService.isSolverAvailable();
        }

        return this.aiJobService.isAnalysisEngineAvailable(engine);
    }

    /**
     * Starts checking puzzle in background, or returns current check if already running.
     * Puzzle must be valid, see validatePuzzle().
     */
    start(puzzle: PuzzleDefinition, engine: PuzzleCheckEngine): PuzzleCheckState
    {
        const key = getPuzzleCheckKey(puzzle, engine);
        const existing = this.getState(key);

        if (existing !== null) {
            return existing;
        }

        const state: PuzzleCheckState = {
            status: 'running',
            engine,
            done: 0,
            total: 0,
            warnings: [],
        };

        this.runs.set(key, state);

        const onProgress = (done: number, total: number): void => {
            state.done = done;
            state.total = total;
        };

        this.check(puzzle, engine, onProgress)
            .then(warnings => {
                state.warnings = warnings;
                state.status = 'done';
            })
            .catch(e => {
                logger.warning('Puzzle katahex check failed', { message: e?.message });
                state.status = 'failed';
                state.error = e?.message ?? 'Unknown error';
            })
            .finally(() => {
                setTimeout(() => {
                    if (this.runs.get(key) === state) {
                        this.runs.delete(key);
                    }
                }, FINISHED_RUN_TTL_MS).unref();
            })
        ;

        return state;
    }

    private check(puzzle: PuzzleDefinition, engine: PuzzleCheckEngine, onProgress: (done: number, total: number) => void): Promise<PuzzleCheckWarning[]>
    {
        if (engine === 'mohex-solver') {
            return checkPuzzleWithSolver(puzzle, {
                solve: input => this.positionSolveCache.solve(input),
                onProgress,
            });
        }

        // Raw policy is better to find plausible moves, fallback to chosen engine if not available
        const policyEngine: AnalysisEngine = this.isEngineAvailable('katahex-intuition') ? 'katahex-intuition' : engine;

        return checkPuzzleWithKatahex(puzzle, {
            analyze: (input, purpose) => this.positionAnalysisCache.analyze({
                ...input,
                engine: purpose === 'policy' ? policyEngine : engine,
            }),
            onProgress,
        });
    }
}
