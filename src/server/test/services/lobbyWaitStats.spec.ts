import assert from 'assert';
import { describe, it } from 'mocha';
import { computeJoinChances, computeJoinChancesByUtcHour, kaplanMeier } from '../../services/lobbyWaitStats.js';
import { type LiveLobbyHistoryGame } from '../../repositories/LiveLobbyHistoryRepository.js';

const at = (hour: number, minute = 0): number => Date.UTC(2026, 10, 1, hour, minute);

const joined = (hour: number, waitSeconds: number): LiveLobbyHistoryGame => [at(hour), at(hour) + waitSeconds * 1000, 1, 20];
const canceled = (hour: number, waitSeconds: number): LiveLobbyHistoryGame => [at(hour), at(hour) + waitSeconds * 1000, 0, 0];

const times = <T>(n: number, f: () => T): T[] => Array.from({ length: n }, f);

describe('lobbyWaitStats', () => {
    describe('kaplanMeier', () => {
        it('removes canceled hosts from those still waiting, instead of counting them as not joined', () => {
            // A joined at 30s, B canceled at 10s, C canceled at 5min
            const survival = kaplanMeier([[30000, 1], [10000, 0], [300000, 0]]);

            assert.strictEqual(survival(0), 1);
            assert.strictEqual(survival(29999), 1);
            assert.strictEqual(survival(30000), 0.5);
            assert.strictEqual(survival(600000), 0.5);
        });

        it('considers canceled host as still waiting when joined at same time', () => {
            const survival = kaplanMeier([[10000, 1], [10000, 0], [20000, 1]]);

            // 1 joined out of 3 at 10s, then 1 out of 1 at 20s
            assert.strictEqual(survival(10000), 1 - 1 / 3);
            assert.strictEqual(survival(20000), 0);
        });
    });

    describe('computeJoinChances', () => {
        it('returns null when no games', () => {
            assert.deepStrictEqual(computeJoinChances([], 14), { firstMinute: null, nextTenMinutes: null });
        });

        it('returns chances even with few games', () => {
            const games = [joined(14, 30), canceled(14, 30 * 60)];

            assert.deepStrictEqual(computeJoinChances(games, 14), { firstMinute: 50, nextTenMinutes: 0 });
        });

        it('returns chances to be joined in first minute, then in next 10 minutes', () => {
            const games = [
                ...times(20, () => joined(14, 30)),
                ...times(20, () => canceled(14, 30)), // removed before first minute
                ...times(15, () => joined(14, 5 * 60)),
                ...times(25, () => canceled(14, 30 * 60)), // still waiting after 11 minutes
            ];

            // 20 joined out of 80 still waiting at 30s, then 15 out of 40 still waiting after 1min
            assert.deepStrictEqual(computeJoinChances(games, 14), { firstMinute: 25, nextTenMinutes: 38 });
        });

        it('returns null for next minutes when all hosts joined in first minute', () => {
            const games = times(10, () => joined(14, 30));

            assert.deepStrictEqual(computeJoinChances(games, 14), { firstMinute: 100, nextTenMinutes: null });
        });

        it('only considers games created around given hour, wrapping around midnight', () => {
            const games = [
                joined(23, 10),
                joined(1, 10),
                canceled(12, 300),
            ];

            assert.strictEqual(computeJoinChances(games, 0).firstMinute, 100);
            assert.strictEqual(computeJoinChances(games, 3).firstMinute, null);
            assert.strictEqual(computeJoinChances(games, 12).firstMinute, 0);
        });
    });

    it('computes chances for each hour of day', () => {
        const games = [joined(12, 45)];
        const byHour = computeJoinChancesByUtcHour(games);

        assert.strictEqual(byHour.length, 24);
        assert.strictEqual(byHour[11].firstMinute, 100);
        assert.strictEqual(byHour[13].firstMinute, 100);
        assert.strictEqual(byHour[14].firstMinute, null);
    });
});
