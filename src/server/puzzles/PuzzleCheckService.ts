import { Service } from 'typedi';
import type { AnalysisEngine } from '../../shared/app/hexplorer.js';
import type { PuzzleDefinition } from '../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleCheckEngine, PuzzleCheckState, PuzzleCheckWarning } from '../../shared/app/puzzles/puzzleCheck.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import PositionSolveCache from '../ai-jobs/PositionSolveCache.js';
import { checkPuzzleWithKatahex } from './PuzzleKatahexChecker.js';
import { checkPuzzleWithSolver } from './PuzzleSolverChecker.js';
import { BackgroundRuns } from './BackgroundRuns.js';
import { getPuzzleRunKey } from './puzzleCheckUtils.js';

/**
 * Identifies a check: same puzzle position and tree, with same engine.
 */
export const getPuzzleCheckKey = (puzzle: PuzzleDefinition, engine: PuzzleCheckEngine): string =>
    getPuzzleRunKey(puzzle, { engine });

/**
 * Runs puzzle katahex checks in background, as they can take long (many positions to analyze),
 * and keeps their state in memory for client polling.
 */
@Service()
export default class PuzzleCheckService
{
    private runs = new BackgroundRuns<PuzzleCheckState>('Puzzle check');

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
        return this.runs.getState(key);
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
        const initialState: PuzzleCheckState = {
            status: 'running',
            engine,
            done: 0,
            total: 0,
            warnings: [],
        };

        return this.runs.start(getPuzzleCheckKey(puzzle, engine), initialState, async state => {
            state.warnings = await this.check(puzzle, engine, (done, total) => {
                state.done = done;
                state.total = total;
            });
        });
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
