import { createHash } from 'node:crypto';
import { Service } from 'typedi';
import type { PuzzleGenerateInput, PuzzleGenerateState } from '../../shared/app/puzzles/puzzleGenerate.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import PositionSolveCache from '../ai-jobs/PositionSolveCache.js';
import { generatePuzzleTree } from './PuzzleTreeGenerator.js';
import logger from '../services/logger.js';

/**
 * How long a finished generation is kept, for client polling.
 */
const FINISHED_RUN_TTL_MS = 10 * 60_000;

/**
 * Identifies a generation: same position, tree and options.
 * Messages are ignored, they don't change the generation.
 */
export const getPuzzleGenerateKey = ({ puzzle, fromPath, templateIds, stopAtComputerMoves = false }: PuzzleGenerateInput): string => {
    const definition = {
        boardsize: puzzle.boardsize,
        redStones: [...puzzle.redStones].sort(),
        blueStones: [...puzzle.blueStones].sort(),
        disabledCells: [...puzzle.disabledCells ?? []].sort(),
        edgeConnections: puzzle.edgeConnections ?? [],
        playerColor: puzzle.playerColor,
        computerPlaysFirst: puzzle.computerPlaysFirst ?? false,
        tree: puzzle.tree,
        fromPath,
        templateIds: [...templateIds].sort(),
        stopAtComputerMoves,
    };

    const json = JSON.stringify(definition, (key, value: unknown) => key === 'message' ? undefined : value);

    return createHash('sha1').update(json).digest('hex');
};

/**
 * Generates puzzle trees in background, as it can take long (many positions to solve),
 * and keeps their state in memory for client polling.
 */
@Service()
export default class PuzzleGenerateService
{
    private runs = new Map<string, PuzzleGenerateState>();

    constructor(
        private aiJobService: AiJobService,
        private positionAnalysisCache: PositionAnalysisCache,
        private positionSolveCache: PositionSolveCache,
    ) {}

    /**
     * Current state of a generation, or null if not started, or expired.
     * A failed generation is returned once, then forgotten so it can be started again.
     */
    getState(key: string): null | PuzzleGenerateState
    {
        const state = this.runs.get(key) ?? null;

        if (state?.status === 'failed') {
            this.runs.delete(key);
        }

        return state;
    }

    isAvailable(): boolean
    {
        return this.aiJobService.isSolverAvailable();
    }

    /**
     * Starts generating in background, or returns current generation if already running.
     * Input must be valid, see PuzzleController.
     */
    start(input: PuzzleGenerateInput): PuzzleGenerateState
    {
        const key = getPuzzleGenerateKey(input);
        const existing = this.getState(key);

        if (existing !== null) {
            return existing;
        }

        const state: PuzzleGenerateState = {
            status: 'running',
            done: 0,
            total: 0,
        };

        this.runs.set(key, state);

        // Without katahex, computer answers come from solver proofs, and no plausible failed moves
        const analyze = this.aiJobService.isAnalysisEngineAvailable('katahex-intuition')
            ? (analysisInput: Parameters<PositionAnalysisCache['analyze']>[0]) => this.positionAnalysisCache.analyze({ ...analysisInput, engine: 'katahex-intuition' })
            : null
        ;

        generatePuzzleTree(input, {
            solve: solveInput => this.positionSolveCache.solve(solveInput),
            analyze,
            onProgress: (done, total) => {
                state.done = done;
                state.total = total;
            },
        })
            .then(output => {
                state.output = output;
                state.status = 'done';
            })
            .catch(e => {
                logger.warning('Puzzle tree generation failed', { message: e?.message });
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
