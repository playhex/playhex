import assert from 'assert';
import { setImmediate } from 'node:timers/promises';
import { afterEach, beforeEach, describe, it } from 'mocha';
import AiJobService, { AiJobError } from '../../ai-jobs/AiJobService.js';
import AiWorkersRegistry from '../../ai-jobs/worker/AiWorkersRegistry.js';
import { AI_JOB_TYPES, getEngineAiJobTypes, type AiJobType, type AnalyzeMoveInput, type AnalyzeMoveOutput } from '../../ai-jobs/protocol.js';
import type { GameAnalyzeData } from '../../../shared/app/models/GameAnalyze.js';

const analyzeMoveOutput = (input: AnalyzeMoveInput): AnalyzeMoveOutput => ({
    moveIndex: input.moveIndex,
    color: input.color,
    whiteWin: 0.5,
    move: { move: input.move, value: 0.5 },
    bestMoves: [],
});

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
     * Process all katahex jobs currently in queue, fails moves in failedMoveIndexes.
     */
    const processAnalyzeMoves = async (failedMoveIndexes: number[] = []): Promise<void> => {
        const { queue } = aiJobService;
        let reserved;

        // Let analyzeGame() submit its jobs
        await setImmediate();

        while ((reserved = await queue.reserve(['katahex-intuition-analyze-move'], { waitMs: 0 })) !== null) {
            const input = reserved.task.data as AnalyzeMoveInput;

            if (failedMoveIndexes.includes(input.moveIndex)) {
                await queue.fail(reserved.jobId, reserved.token, 'failed', false);
            } else {
                await queue.complete(reserved.jobId, reserved.token, analyzeMoveOutput(input));
            }
        }
    };

    it('analyzes a game, with progress on each analyzed move', async () => {
        const progresses: GameAnalyzeData[] = [];
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, analyze => progresses.push(analyze));

        await processAnalyzeMoves();
        const analyze = await analyzing;

        assert.strictEqual(progresses.length, 2);
        assert.deepStrictEqual(progresses[0].map(move => move === null), [false, true, true]);
        assert.ok(analyze);
        assert.strictEqual(analyze.length, 3);
        assert.ok(analyze.every(move => move !== null));
    });

    it('keeps failed moves as null, and returns null if all moves failed', async () => {
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, () => {});
        await processAnalyzeMoves([1]);
        const analyze = await analyzing;

        assert.ok(analyze);
        assert.strictEqual(analyze[1], null);

        const analyzingAllFailed = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2' }, () => {});
        await processAnalyzeMoves([0, 1]);

        assert.strictEqual(await analyzingAllFailed, null);
    });

    it('fails move analyzes that no worker took in time, keeps analyzed ones', async () => {
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, () => {}, 100);
        await setImmediate();

        const reserved = await aiJobService.queue.reserve(['katahex-intuition-analyze-move'], { waitMs: 0 });
        assert.ok(reserved);
        await aiJobService.queue.complete(reserved.jobId, reserved.token, analyzeMoveOutput(reserved.task.data as AnalyzeMoveInput));

        const analyze = await analyzing;

        assert.ok(analyze);
        assert.deepStrictEqual(analyze.map(move => move === null), [false, true, true]);
        assert.deepStrictEqual(await aiJobService.queue.getCounts('katahex-intuition-analyze-move'), { waiting: 0, active: 0 });
    });

    it('ends game analyze with moves analyzed so far when a move is never processed', async () => {
        const { queue } = aiJobService;
        const analyzing = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2' }, () => {}, 50, 100);
        await setImmediate();

        const reserved = await queue.reserve(['katahex-intuition-analyze-move'], { waitMs: 0 });
        assert.ok(reserved);
        await queue.complete(reserved.jobId, reserved.token, analyzeMoveOutput(reserved.task.data as AnalyzeMoveInput));

        // Taken by a worker which never sends result, i.e worker stopped and job given back to queue with no worker left
        const stuck = await queue.reserve(['katahex-intuition-analyze-move'], { waitMs: 0 });
        assert.ok(stuck);

        const analyze = await analyzing;

        assert.ok(analyze);
        assert.deepStrictEqual(analyze.map(move => move === null), [false, true]);

        // Late result is ignored
        await queue.complete(stuck.jobId, stuck.token, analyzeMoveOutput(stuck.task.data as AnalyzeMoveInput));
    });

    it('processes concurrent bot moves, position and game analyzes, by priority, without mixing results', async () => {
        const { queue } = aiJobService;
        const game = { size: 11, movesHistory: 'f6', currentPlayer: 'white' as const, swapRule: false };

        const analyzingA = aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, () => {});
        const analyzingB = aiJobService.analyzeGame({ size: 11, movesHistory: 'd4 e5' }, () => {});
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
            const result = results[task.type] ?? analyzeMoveOutput(task.data as AnalyzeMoveInput);

            await queue.complete(reserved.jobId, reserved.token, result);
        }

        assert.deepStrictEqual(
            processedTypes,
            [...processedTypes].sort((a, b) => AI_JOB_TYPES.indexOf(a) - AI_JOB_TYPES.indexOf(b)),
        );
        assert.strictEqual(processedTypes.length, 7);

        assert.strictEqual(await moving, 'g7');
        assert.deepStrictEqual(await analyzingPosition, { whiteWin: 0.4, policy: [] });
        assert.deepStrictEqual((await analyzingA)?.map(move => move?.move.move), ['a1', 'b2', 'c3']);
        assert.deepStrictEqual((await analyzingB)?.map(move => move?.move.move), ['d4', 'e5']);
    });

    it('cancels submitted moves when game analyze could not be fully submitted', async () => {
        const { queue } = aiJobService;
        const submit = queue.submit.bind(queue);
        let submitCount = 0;

        queue.submit = (...args) => ++submitCount === 2
            ? Promise.reject(new Error('redis down'))
            : submit(...args)
        ;

        await assert.rejects(aiJobService.analyzeGame({ size: 11, movesHistory: 'a1 b2 c3' }, () => {}), AiJobError);
        assert.deepStrictEqual(await queue.getCounts('katahex-intuition-analyze-move'), { waiting: 0, active: 0 });
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

    it('refuses board sizes not supported by engine', async () => {
        await assert.rejects(aiJobService.calculateMove({
            type: 'mohex',
            data: { game: { size: 19, movesHistory: '', currentPlayer: 'black', swapRule: false }, maxGames: 100 },
        }), AiJobError);
    });
});
