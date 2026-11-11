import assert from 'assert';
import {
    calcMatchmakingStreak,
    createDefaultMatchmakingPreferences,
    getMatchmakingTimeControl,
    getRushHour,
    isMatchmakingCompatible,
    isTimeControlCloseToMatchmaking,
    isValidMatchmakingPreferences,
    nextMatchmakingChoice,
    normalizeMatchmakingPreferences,
    pickMatchmakingBoardsize,
    type MatchmakingPreferences,
} from '../matchmakingRules.js';

const prefs = (boardsizes: MatchmakingPreferences['boardsizes']): MatchmakingPreferences => ({ boardsizes });

describe('matchmakingRules', () => {
    it('cycles choices yes => heart => no => yes', () => {
        assert.strictEqual(nextMatchmakingChoice('yes'), 'heart');
        assert.strictEqual(nextMatchmakingChoice('heart'), 'no');
        assert.strictEqual(nextMatchmakingChoice('no'), 'yes');
    });

    it('defaults to 11 to 14 accepted', () => {
        const preferences = createDefaultMatchmakingPreferences();

        assert.deepStrictEqual(Object.keys(preferences.boardsizes).map(Number), [11, 12, 13, 14]);
        assert.ok(isValidMatchmakingPreferences(preferences));
    });

    it('validates preferences', () => {
        assert.ok(isValidMatchmakingPreferences(prefs({ 19: 'heart' })));
        assert.ok(!isValidMatchmakingPreferences(prefs({})));
        assert.ok(!isValidMatchmakingPreferences(prefs({ 11: 'no' })));
        assert.ok(!isValidMatchmakingPreferences(prefs({ 10: 'yes' })));
        assert.ok(!isValidMatchmakingPreferences(prefs({ 20: 'yes' })));
        assert.ok(!isValidMatchmakingPreferences({ boardsizes: { 11: 'maybe' } }));
        assert.ok(!isValidMatchmakingPreferences({ boardsizes: ['yes'] }));
        assert.ok(!isValidMatchmakingPreferences(null));
        assert.ok(!isValidMatchmakingPreferences('yes'));
    });

    it('normalizes preferences', () => {
        assert.deepStrictEqual(
            normalizeMatchmakingPreferences(prefs({ 11: 'no', 13: 'heart', 14: 'yes' })),
            prefs({ 13: 'heart', 14: 'yes' }),
        );
    });

    it('gives time control depending on boardsize', () => {
        assert.deepStrictEqual(getMatchmakingTimeControl(11), { family: 'fischer', options: { initialTime: 300_000, timeIncrement: 5_000 } });
        assert.deepStrictEqual(getMatchmakingTimeControl(15), { family: 'fischer', options: { initialTime: 300_000, timeIncrement: 5_000 } });
        assert.deepStrictEqual(getMatchmakingTimeControl(16), { family: 'fischer', options: { initialTime: 420_000, timeIncrement: 7_000 } });
        assert.deepStrictEqual(getMatchmakingTimeControl(19), { family: 'fischer', options: { initialTime: 420_000, timeIncrement: 7_000 } });
    });

    it('checks compatibility, never on a refused boardsize', () => {
        assert.ok(isMatchmakingCompatible(prefs({ 11: 'yes', 13: 'yes' }), prefs({ 13: 'heart' })));
        assert.ok(!isMatchmakingCompatible(prefs({ 11: 'yes' }), prefs({ 13: 'heart' })));
        assert.ok(!isMatchmakingCompatible(prefs({ 11: 'no' }), prefs({ 11: 'yes' })));
    });

    it('picks boardsize by tiers', () => {
        const random = () => 0;

        // Both hearts first
        assert.deepStrictEqual(
            pickMatchmakingBoardsize(prefs({ 11: 'heart', 13: 'heart', 19: 'heart' }), prefs({ 11: 'yes', 19: 'heart', 13: 'yes' }), random),
            { boardsize: 19, tier: 'both_hearts' },
        );

        // Then one heart
        assert.deepStrictEqual(
            pickMatchmakingBoardsize(prefs({ 11: 'yes', 13: 'heart' }), prefs({ 11: 'yes', 13: 'yes', 14: 'heart' }), random),
            { boardsize: 13, tier: 'one_heart' },
        );

        // Then any common, never refused
        assert.deepStrictEqual(
            pickMatchmakingBoardsize(prefs({ 11: 'yes', 12: 'heart' }), prefs({ 11: 'yes', 14: 'heart' }), random),
            { boardsize: 11, tier: 'common' },
        );

        assert.strictEqual(pickMatchmakingBoardsize(prefs({ 11: 'heart' }), prefs({ 12: 'heart' })), null);
    });

    it('picks randomly among tier', () => {
        const a = prefs({ 11: 'yes', 12: 'yes', 13: 'yes' });

        assert.strictEqual(pickMatchmakingBoardsize(a, a, () => 0)?.boardsize, 11);
        assert.strictEqual(pickMatchmakingBoardsize(a, a, () => 0.5)?.boardsize, 12);
        assert.strictEqual(pickMatchmakingBoardsize(a, a, () => 0.99)?.boardsize, 13);
    });

    it('accepts lobby games with close time control only', () => {
        const fischer = (minutes: number, increment: number) => ({ family: 'fischer' as const, options: { initialTime: minutes * 60_000, timeIncrement: increment * 1000 } });

        assert.ok(isTimeControlCloseToMatchmaking(fischer(5, 5), 11));
        assert.ok(isTimeControlCloseToMatchmaking(fischer(4, 4), 11));
        assert.ok(isTimeControlCloseToMatchmaking(fischer(5, 8), 13));
        assert.ok(isTimeControlCloseToMatchmaking(fischer(7, 7), 19));
        assert.ok(isTimeControlCloseToMatchmaking({ family: 'byoyomi', options: { initialTime: 5 * 60_000, periodTime: 5000, periodsCount: 5 } }, 11));

        assert.ok(!isTimeControlCloseToMatchmaking(fischer(1, 0), 11));
        assert.ok(!isTimeControlCloseToMatchmaking(fischer(2, 2), 11));
        assert.ok(!isTimeControlCloseToMatchmaking(fischer(30, 0), 11));
        assert.ok(!isTimeControlCloseToMatchmaking(fischer(10, 10), 11));
        assert.ok(!isTimeControlCloseToMatchmaking({ family: 'fischer', options: { initialTime: 86400_000 * 3, timeIncrement: 86400_000 } }, 11));
    });

    it('calculates streak of consecutive days', () => {
        const now = new Date('2026-11-10T12:00:00Z');

        assert.strictEqual(calcMatchmakingStreak([], now), 0);
        assert.strictEqual(calcMatchmakingStreak(['2026-11-10'], now), 1);
        assert.strictEqual(calcMatchmakingStreak(['2026-11-10', '2026-11-09', '2026-11-08', '2026-11-06'], now), 3);

        // Not yet played today, streak still alive
        assert.strictEqual(calcMatchmakingStreak(['2026-11-09', '2026-11-08'], now), 2);

        // Broken
        assert.strictEqual(calcMatchmakingStreak(['2026-11-08', '2026-11-07'], now), 0);

        // Across month
        assert.strictEqual(calcMatchmakingStreak(['2026-11-01', '2026-10-31', '2026-10-30'], new Date('2026-11-01T23:59:00Z')), 3);
    });

    it('gives current or next rush hour', () => {
        const before = getRushHour(new Date('2026-11-10T10:00:00Z'));
        assert.strictEqual(before.ongoing, false);
        assert.strictEqual(before.start.toISOString(), '2026-11-10T17:00:00.000Z');
        assert.strictEqual(before.end.toISOString(), '2026-11-10T21:00:00.000Z');

        const during = getRushHour(new Date('2026-11-10T18:30:00Z'));
        assert.strictEqual(during.ongoing, true);
        assert.strictEqual(during.start.toISOString(), '2026-11-10T17:00:00.000Z');

        const after = getRushHour(new Date('2026-11-10T21:00:00Z'));
        assert.strictEqual(after.ongoing, false);
        assert.strictEqual(after.start.toISOString(), '2026-11-11T17:00:00.000Z');
    });
});
