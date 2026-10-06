import assert from 'assert';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, it } from 'mocha';
import AiJobService, { AiJobError } from '../../ai-jobs/AiJobService.js';
import AiWorkersRegistry from '../../ai-jobs/worker/AiWorkersRegistry.js';
import { AI_JOB_TYPES, getEngineAiJobTypes, type AiJobType, type AnalyzeGameInput, type AnalyzeGameOutput, type AnalyzeMoveInput, type AnalyzeMoveOutput } from '../../ai-jobs/protocol.js';
import { splitToAnalyzeMoveInputs } from '../../ai-jobs/gameAnalyze.js';
import { MCTS_PLAYOUTS } from '../../../shared/app/mctsSettings.js';

const analyzeMoveOutput = (input: AnalyzeMoveInput): AnalyzeMoveOutput => ({
    moveIndex: input.moveIndex,
    color: input.color,
    whiteWin: 0.5,
    move: { move: input.move, value: 0.5 },
    bestMoves: [],
});

const analyzeGameOutput = (input: AnalyzeGameInput): AnalyzeGameOutput =>
    splitToAnalyzeMoveInputs(input).map(analyzeMoveOutput)
;

describe('AiJobService', () => {
    let nodeEnv: undefined | string;
    let aiJobService: AiJobService;

    beforeEach(() => {
        // Use in memory queue
        nodeEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        aiJobService = new AiJobService(new AiWorkersRegistry());
    });

    afterEach(async () => {
        await aiJobService.queue.close();

        if (nodeEnv === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = nodeEnv;
        }
    });

    /**
     * Process game analyze job currently in queue, like a worker would.
     */
    const processAnalyzeGame = async (fail = false): Promise<void> => {
        const { queue } = aiJobService;

        // Let analyzeGame() submit its job
        await setImmediate();

        const reserved = await queue.reserve(['katahex-intuition-analyze-game'], { waitMs: 0 });
        assert.ok(reserved);

        if (fail) {
            await queue.fail(reserved.jobId, reserved.token, 'failed', false);
            return;
        }

        await queue.complete(reserved.jobId, reserved.token, analyzeGameOutput(reserved.task.data as AnalyzeGameInput));
    };

    it('analyzes a game in a single job', async () => {
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' });

        await processAnalyzeGame();
        const analyze = await analyzing;

        assert.ok(analyze);
        assert.deepStrictEqual(analyze.map(move => move?.move.move), ['a1', 'b2', 'c3']);

        // Win rate after a move is the win rate before next move
        assert.strictEqual(analyze[0]?.move.whiteWin, 0.5);
        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-analyze-game'), { waiting: 0, active: 0 });
    });

    it('deduces swap move analyze from third move', async () => {
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a2 swap-pieces c3' });

        await processAnalyzeGame();
        const analyze = await analyzing;

        assert.ok(analyze);
        assert.strictEqual(analyze[1]?.move.move, 'swap-pieces');
    });

    it('returns null when game has no move', async () => {
        assert.strictEqual(await aiJobService.analyzeGame({ size: 11, movesHistory: '' }), null);
    });

    it('fails game analyze when worker fails', async () => {
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' });

        await processAnalyzeGame(true);

        await assert.rejects(analyzing, AiJobError);
    });

    it('fails game analyze when no worker took it in time', async () => {
        await assert.rejects(aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, 50), AiJobError);
        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-analyze-game'), { waiting: 0, active: 0 });
    });

    it('processes concurrent bot moves, position and game analyzes, by priority, without mixing results', async () => {
        const { queue } = aiJobService;
        const game = { size: 11, movesHistory: 'f6', currentPlayer: 'white' as const, swapRule: false };

        const analyzingA = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' });
        const analyzingB = aiJobService.analyzeGame({ size: 11, movesHistory: 'd4 e5' });
        const moving = aiJobService.calculateMove({ type: 'katahex-intuition-move', data: { game } });
        const analyzingPosition = aiJobService.analyzePosition({ size: 11, color: 'black', black: 'a1', white: '' });

        await setImmediate();

        // Single worker processing all katahex job types, except tree search ones
        const types = getEngineAiJobTypes('katahex').filter(type => !type.startsWith('katahex-mcts-'));
        const processedTypes: AiJobType[] = [];
        let reserved;

        while ((reserved = await queue.reserve(types, { waitMs: 0 })) !== null) {
            const { task } = reserved;
            processedTypes.push(task.type);

            const results: Partial<Record<AiJobType, unknown>> = {
                'katahex-intuition-move': 'g7',
                'katahex-intuition-analyze-position': { whiteWin: 0.4, policy: [] },
            };
            const result = results[task.type] ?? analyzeGameOutput(task.data as AnalyzeGameInput);

            await queue.complete(reserved.jobId, reserved.token, result);
        }

        assert.deepStrictEqual(
            processedTypes,
            [...processedTypes].sort((a, b) => AI_JOB_TYPES.indexOf(a) - AI_JOB_TYPES.indexOf(b)),
        );
        assert.strictEqual(processedTypes.length, 4);

        assert.strictEqual(await moving, 'g7');
        assert.deepStrictEqual(await analyzingPosition, { whiteWin: 0.4, policy: [] });
        assert.deepStrictEqual((await analyzingA)?.map(move => move?.move.move), ['a1', 'b2', 'c3']);
        assert.deepStrictEqual((await analyzingB)?.map(move => move?.move.move), ['d4', 'e5']);
    });

    it('calculates davies moves locally in development', async () => {
        const move = await aiJobService.calculateMove({
            type: 'davies',
            data: { game: { size: 11, movesHistory: 'f6', currentPlayer: 'white', swapRule: false }, level: 1 },
        });

        assert.match(move, /^[a-k]\d+$/);
        assert.strictEqual(aiJobService.isJobTypeAvailable('davies'), true);
        assert.strictEqual(aiJobService.isJobTypeAvailable('katahex-intuition-move'), false);
    });

    it('stops waiting a move when no worker processes it in time', async () => {
        await assert.rejects(aiJobService.calculateMove({
            type: 'katahex-intuition-move',
            data: { game: { size: 11, movesHistory: 'f6', currentPlayer: 'white', swapRule: false } },
        }, 50), AiJobError);

        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-move'), { waiting: 0, active: 0 });
    });

    it('sends tree search jobs with playouts set by server', async () => {
        const { queue } = aiJobService;
        const input: AnalyzeMoveInput = { moveIndex: 2, move: 'c3', color: 'black', isLastMoveOfGame: false, movesHistory: 'a1 b2', size: 5 };

        const positionPromise = aiJobService.analyzePosition({ size: 5, color: 'black', black: '', white: '' }, true);
        const movePromise = aiJobService.analyzeMoveMcts(input);

        await setImmediate();

        const positionJob = await queue.reserve(['katahex-mcts-analyze-position'], { waitMs: 0 });
        const moveJob = await queue.reserve(['katahex-mcts-analyze-move'], { waitMs: 0 });

        assert.ok(positionJob && moveJob);
        assert.strictEqual((positionJob.task.data as { maxPlayouts: number }).maxPlayouts, MCTS_PLAYOUTS);
        assert.deepStrictEqual(moveJob.task.data, { ...input, maxPlayouts: MCTS_PLAYOUTS });

        await queue.complete(positionJob.jobId, positionJob.token, { whiteWin: 0.5, policy: [] });
        await queue.complete(moveJob.jobId, moveJob.token, analyzeMoveOutput(input));

        assert.deepStrictEqual(await positionPromise, { whiteWin: 0.5, policy: [] });
        assert.deepStrictEqual(await movePromise, analyzeMoveOutput(input));
    });

    it('refuses board sizes not supported by engine', async () => {
        await assert.rejects(aiJobService.calculateMove({
            type: 'mohex',
            data: { game: { size: 19, movesHistory: '', currentPlayer: 'black', swapRule: false }, maxGames: 100 },
        }), AiJobError);
    });
});
