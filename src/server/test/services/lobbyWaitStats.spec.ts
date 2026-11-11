import assert from 'assert';
import { describe, it } from 'mocha';
import { computeTypicalJoinMsByUtcHour, computeTypicalJoinTime } from '../../services/lobbyWaitStats.js';
import { type LiveLobbyHistoryGame } from '../../repositories/LiveLobbyHistoryRepository.js';

const at = (hour: number, minute = 0): number => Date.UTC(2026, 10, 1, hour, minute);

const joined = (hour: number, waitSeconds: number): LiveLobbyHistoryGame => [at(hour), at(hour) + waitSeconds * 1000, 1, 20];
const canceled = (hour: number, waitSeconds: number): LiveLobbyHistoryGame => [at(hour), at(hour) + waitSeconds * 1000, 0, 0];

describe('lobbyWaitStats', () => {
    it('returns null when not enough joined games', () => {
        const games = Array.from({ length: 9 }, () => joined(14, 30));

        assert.strictEqual(computeTypicalJoinTime(games, 14), null);
    });

    it('returns p60 of joined games, ignoring canceled ones', () => {
        const games = [
            ...Array.from({ length: 6 }, () => joined(14, 10)),
            ...Array.from({ length: 4 }, () => joined(14, 60)),
            ...Array.from({ length: 20 }, () => canceled(14, 5)),
        ];

        // sorted index 5.4: between 10s and 60s
        assert.deepStrictEqual(computeTypicalJoinTime(games, 14), { joinMs: 30000, sampleSize: 10 });
    });

    it('returns p60 on exact rank', () => {
        // 11 games, index 6 is exact
        const games = Array.from({ length: 11 }, (_, i) => joined(14, (i + 1) * 10));

        assert.strictEqual(computeTypicalJoinTime(games, 14)?.joinMs, 70000);
    });

    it('only considers games created around given hour, wrapping around midnight', () => {
        const games = [
            ...Array.from({ length: 5 }, () => joined(23, 10)),
            ...Array.from({ length: 5 }, () => joined(1, 10)),
            ...Array.from({ length: 10 }, () => joined(12, 300)),
        ];

        assert.strictEqual(computeTypicalJoinTime(games, 0)?.joinMs, 10000);
        assert.strictEqual(computeTypicalJoinTime(games, 2), null);
    });

    it('computes stats for each hour of day', () => {
        const games = Array.from({ length: 10 }, () => joined(12, 45));
        const byHour = computeTypicalJoinMsByUtcHour(games);

        assert.strictEqual(byHour.length, 24);
        assert.strictEqual(byHour[11], 45000);
        assert.strictEqual(byHour[12], 45000);
        assert.strictEqual(byHour[13], 45000);
        assert.strictEqual(byHour[14], null);
    });
});
