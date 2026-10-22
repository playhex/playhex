import { Service } from 'typedi';
import { type PuzzleGenerateInput, type PuzzleGenerateState } from '../../shared/app/puzzles/puzzleGenerate.js';
import AiJobService from '../ai-jobs/AiJobService.js';
import PositionAnalysisCache from '../ai-jobs/PositionAnalysisCache.js';
import PositionSolveCache from '../ai-jobs/PositionSolveCache.js';
import { generatePuzzleTree, type PolicyAnalyzer } from './PuzzleTreeGenerator.js';
import { BackgroundRuns } from './BackgroundRuns.js';
import { getPuzzleRunKey } from './puzzleCheckUtils.js';

/**
 * Identifies a generation: same position, tree and options.
 */
export const getPuzzleGenerateKey = ({ puzzle, fromPath, templateIds }: PuzzleGenerateInput): string =>
    getPuzzleRunKey(puzzle, { fromPath, templateIds: [...templateIds].sort() });

/**
 * Generates puzzle trees in background, as it can take long (many positions to solve),
 * and keeps their state in memory for client polling.
 */
@Service()
export default class PuzzleGenerateService
{
    private runs = new BackgroundRuns<PuzzleGenerateState>('Puzzle tree generation');

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
        return this.runs.getState(key);
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
        // Without katahex, computer answers come from solver proofs, and no plausible failed moves
        const analyze: null | PolicyAnalyzer = this.aiJobService.isAnalysisEngineAvailable('katahex-intuition')
            ? analysisInput => this.positionAnalysisCache.analyze({ ...analysisInput, engine: 'katahex-intuition' })
            : null
        ;

        const initialState: PuzzleGenerateState = {
            status: 'running',
            done: 0,
            total: 0,
        };

        return this.runs.start(getPuzzleGenerateKey(input), initialState, async state => {
            state.output = await generatePuzzleTree(input, {
                solve: solveInput => this.positionSolveCache.solve(solveInput),
                analyze,
                onProgress: (done, total) => {
                    state.done = done;
                    state.total = total;
                },
            });
        });
    }
}
