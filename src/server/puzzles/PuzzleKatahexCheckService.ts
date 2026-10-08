import { createHash } from 'node:crypto';
import { Service } from 'typedi';
import type { AnalysisEngine } from '../../shared/app/hexplorer.js';
import type { PuzzleDefinition } from '../../shared/app/puzzles/puzzleTree.js';
import type { PuzzleKatahexCheckState } from '../../shared/app/puzzles/puzzleKatahexCheck.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import { checkPuzzleWithKatahex } from './PuzzleKatahexChecker.js';
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
export const getPuzzleKatahexCheckKey = (puzzle: PuzzleDefinition, engine: AnalysisEngine): string => {
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
export default class PuzzleKatahexCheckService
{
    private runs = new Map<string, PuzzleKatahexCheckState>();

    constructor(
        private aiJobService: AiJobService,
        private positionAnalysisCache: PositionAnalysisCache,
    ) {}

    /**
     * Current state of a check, or null if not started, or expired.
     * A failed check is returned once, then forgotten so it can be started again.
     */
    getState(key: string): null | PuzzleKatahexCheckState
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
    isEngineAvailable(engine: AnalysisEngine): boolean
    {
        return this.aiJobService.isAnalysisEngineAvailable(engine);
    }

    /**
     * Starts checking puzzle in background, or returns current check if already running.
     * Puzzle must be valid, see validatePuzzle().
     */
    start(puzzle: PuzzleDefinition, engine: AnalysisEngine): PuzzleKatahexCheckState
    {
        const key = getPuzzleKatahexCheckKey(puzzle, engine);
        const existing = this.getState(key);

        if (existing !== null) {
            return existing;
        }

        const state: PuzzleKatahexCheckState = {
            status: 'running',
            engine,
            done: 0,
            total: 0,
            warnings: [],
        };

        this.runs.set(key, state);

        // Raw policy is better to find plausible moves, fallback to chosen engine if not available
        const policyEngine: AnalysisEngine = this.isEngineAvailable('katahex-intuition') ? 'katahex-intuition' : engine;

        checkPuzzleWithKatahex(puzzle, {
            analyze: (input, purpose) => this.positionAnalysisCache.analyze({
                ...input,
                engine: purpose === 'policy' ? policyEngine : engine,
            }),
            onProgress: (done, total) => {
                state.done = done;
                state.total = total;
            },
        })
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
}
