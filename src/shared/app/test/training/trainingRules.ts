import assert from 'node:assert';
import { describe, it } from 'mocha';
import {
    applyAttempt,
    buildSession,
    getNewPuzzlesCount,
    getNextReviewAt,
    getPuzzleLevel,
    getTrainingState,
    getUnlockedLevelsCount,
    type ProgressByPuzzle,
    scoreAttempt,
    type TrainingProgressData,
} from '../../training/trainingRules.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const now = new Date('2026-09-01T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const later = (ms: number) => new Date(now.getTime() + ms);

const createProgress = (box: number, nextReviewAt: Date = later(DAY), lapses = 0): TrainingProgressData => ({
    box,
    lapses,
    attemptsCount: box + 1,
    lastAttemptAt: ago(DAY),
    nextReviewAt,
});

/**
 * Keeps order, to test session content without randomness
 */
const noShuffle = () => 0.999;

const PERFECT = [true, true];
const GOOD = [true, false];
const BAD = [false, false];

describe('trainingRules', () => {
    describe('getPuzzleLevel', () => {
        it('returns level starting at 1, or null', () => {
            const levels = [['a', 'b'], ['c']];

            assert.strictEqual(getPuzzleLevel('a', levels), 1);
            assert.strictEqual(getPuzzleLevel('c', levels), 2);
            assert.strictEqual(getPuzzleLevel('z', levels), null);
        });
    });

    describe('scoreAttempt', () => {
        it('scores lines', () => {
            assert.strictEqual(scoreAttempt([true, true, true]), 'perfect');
            assert.strictEqual(scoreAttempt([true, false]), 'good');
            assert.strictEqual(scoreAttempt([true, true, false]), 'good');
            assert.strictEqual(scoreAttempt([true, false, false]), 'bad');
            assert.strictEqual(scoreAttempt([false]), 'bad');
            assert.strictEqual(scoreAttempt([]), 'bad');
        });
    });

    describe('getTrainingState', () => {
        it('returns state from box', () => {
            assert.strictEqual(getTrainingState(null), 'new');
            assert.strictEqual(getTrainingState({ box: 0 }), 'not_acquired');
            assert.strictEqual(getTrainingState({ box: 1 }), 'in_progress');
            assert.strictEqual(getTrainingState({ box: 2 }), 'in_progress');
            assert.strictEqual(getTrainingState({ box: 3 }), 'acquired');
            assert.strictEqual(getTrainingState({ box: 5 }), 'acquired');
        });
    });

    describe('applyAttempt', () => {
        it('first attempt', () => {
            assert.deepStrictEqual(applyAttempt(null, PERFECT, now), {
                box: 1,
                lapses: 0,
                attemptsCount: 1,
                lastAttemptAt: now,
                nextReviewAt: later(DAY),
            });

            assert.strictEqual(applyAttempt(null, GOOD, now).box, 1);

            const bad = applyAttempt(null, BAD, now);
            assert.strictEqual(bad.box, 0);
            assert.deepStrictEqual(bad.nextReviewAt, now);
        });

        it('perfect goes to next box, up to max', () => {
            assert.strictEqual(applyAttempt(createProgress(2), PERFECT, now).box, 3);
            assert.strictEqual(applyAttempt(createProgress(5), PERFECT, now).box, 5);
        });

        it('good keeps box, at least 1', () => {
            assert.strictEqual(applyAttempt(createProgress(0), GOOD, now).box, 1);
            assert.strictEqual(applyAttempt(createProgress(4), GOOD, now).box, 4);
        });

        it('bad goes back 2 boxes, and counts a lapse only when acquired', () => {
            const forgotten = applyAttempt(createProgress(4), BAD, now);
            assert.strictEqual(forgotten.box, 2);
            assert.strictEqual(forgotten.lapses, 1);

            const notAcquired = applyAttempt(createProgress(1), BAD, now);
            assert.strictEqual(notAcquired.box, 0);
            assert.strictEqual(notAcquired.lapses, 0);
        });

        it('does not mutate input', () => {
            const progress = createProgress(2);
            applyAttempt(progress, PERFECT, now);
            assert.strictEqual(progress.box, 2);
        });
    });

    describe('getNextReviewAt', () => {
        it('uses box interval, shortened by lapses', () => {
            assert.deepStrictEqual(getNextReviewAt(0, 0, now), now);
            assert.deepStrictEqual(getNextReviewAt(3, 0, now), later(7 * DAY));
            assert.deepStrictEqual(getNextReviewAt(3, 1, now), later(Math.round(7 * DAY * 0.7)));
            assert.deepStrictEqual(getNextReviewAt(3, 2, now), later(Math.round(7 * DAY * 0.49)));
        });
    });

    describe('getUnlockedLevelsCount', () => {
        const levels = [['a', 'b', 'c'], ['d'], ['e']];

        it('unlocks first level only by default', () => {
            assert.strictEqual(getUnlockedLevelsCount(levels, new Map()), 1);
            assert.strictEqual(getUnlockedLevelsCount([], new Map()), 0);
        });

        it('needs all templates tried', () => {
            const progresses: ProgressByPuzzle = new Map([
                ['a', createProgress(5)],
                ['b', createProgress(5)],
            ]);

            assert.strictEqual(getUnlockedLevelsCount(levels, progresses), 1);
        });

        it('needs 60% acquired', () => {
            const progresses: ProgressByPuzzle = new Map([
                ['a', createProgress(3)],
                ['b', createProgress(2)],
                ['c', createProgress(0)],
            ]);

            assert.strictEqual(getUnlockedLevelsCount(levels, progresses), 1);

            progresses.set('b', createProgress(3));

            assert.strictEqual(getUnlockedLevelsCount(levels, progresses), 2);

            progresses.set('d', createProgress(4));

            assert.strictEqual(getUnlockedLevelsCount(levels, progresses), 3);
        });
    });

    describe('getNewPuzzlesCount', () => {
        it('depends on recent success rate', () => {
            assert.strictEqual(getNewPuzzlesCount([]), 3);
            assert.strictEqual(getNewPuzzlesCount([PERFECT, GOOD, PERFECT, PERFECT, PERFECT]), 3);
            assert.strictEqual(getNewPuzzlesCount([PERFECT, GOOD, PERFECT, BAD, BAD]), 2);
            assert.strictEqual(getNewPuzzlesCount([PERFECT, BAD, BAD]), 1);
        });
    });

    describe('buildSession', () => {
        const levels = [
            ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10', 'a11', 'a12'],
            ['b1', 'b2'],
        ];

        it('beginner gets new templates of first level', () => {
            const session = buildSession(levels, new Map(), [], now, 10, noShuffle);

            assert.deepStrictEqual(session, ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10']);
        });

        it('regular player: due reviews first, then templates in progress, few new ones', () => {
            const progresses: ProgressByPuzzle = new Map([
                ['a1', createProgress(4, ago(2 * DAY))],
                ['a2', createProgress(3, ago(DAY))],
                ['a3', createProgress(3, ago(3 * DAY))],
                ['a4', createProgress(5, later(10 * DAY))],
                ['a5', createProgress(2, later(DAY))],
                ['a6', createProgress(1, ago(HOUR))],
                ['a7', createProgress(0, now)],
            ]);

            const session = buildSession(levels, progresses, [PERFECT, PERFECT, GOOD, BAD], now, 10, noShuffle);

            // warm-up: oldest due acquired first, max 2
            assert.deepStrictEqual(session.slice(0, 2), ['a3', 'a1']);

            // core: due first, then lowest box. 2 new (75% success). Filled with acquired not due
            assert.deepStrictEqual(session.slice(2), ['a7', 'a6', 'a5', 'a8', 'a9', 'a2', 'a4']);
        });

        it('player who forgot many templates: no new template', () => {
            const progresses: ProgressByPuzzle = new Map(
                ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].map(publicId => [publicId, createProgress(1, ago(HOUR), 1)]),
            );
            progresses.set('a8', createProgress(4, ago(DAY)));

            const session = buildSession(levels, progresses, [BAD, BAD, PERFECT], now, 10, noShuffle);

            assert.strictEqual(session[0], 'a8');
            assert.strictEqual(session.length, 7);
            assert.ok(!session.includes('a9'));
        });

        it('proposes next level templates once unlocked', () => {
            const progresses: ProgressByPuzzle = new Map(
                levels[0].map(publicId => [publicId, createProgress(3, later(DAY))]),
            );

            const session = buildSession(levels, progresses, [PERFECT, PERFECT], now, 10, noShuffle);

            assert.deepStrictEqual(session.slice(0, 2), ['b1', 'b2']);
            assert.strictEqual(session.length, 10);
        });

        it('shuffles all but warm-up', () => {
            const progresses: ProgressByPuzzle = new Map([
                ['a1', createProgress(3, ago(DAY))],
                ['a2', createProgress(1, ago(DAY))],
                ['a3', createProgress(2, ago(DAY))],
            ]);

            const session = buildSession(levels, progresses, [PERFECT], now, 10, () => 0);

            assert.strictEqual(session[0], 'a1');
            assert.deepStrictEqual([...session.slice(1)].sort(), ['a2', 'a3', 'a4', 'a5', 'a6'].sort());
        });
    });
});
