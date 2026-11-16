import assert from 'assert';
import { describe, it } from 'mocha';
import { computeAdminStats, periodStart } from '../../services/admin-stats/computeAdminStats.js';
import { type AdminStatsHumanGame, type AdminStatsRawData } from '../../repositories/AdminStatsRepository.js';

const DAY = 86400 * 1000;
const MINUTE = 60 * 1000;

/** A wednesday, at noon */
const now = Date.UTC(2026, 10, 18, 12);

const thisWeek = periodStart(now, 'week');
const lastWeek = thisWeek - 7 * DAY;

const emptyData = (): AdminStatsRawData => ({
    humanGames: [],
    players: new Map(),
    lobbyGames: [],
    botGamesByDay: [],
    newPlayersByDay: [],
    newPlayingGuestsByDay: [],
    guestUpgradesByDay: [],
    rankedRatingGaps: [],
});

const game = (endedAt: number, playerIds: [number, number], extra: Partial<AdminStatsHumanGame> = {}): AdminStatsHumanGame => ({
    createdAt: endedAt - 10 * MINUTE,
    startedAt: endedAt - 9 * MINUTE,
    endedAt,
    live: true,
    ranked: false,
    movesCount: 30,
    rematched: false,
    playerIds,
    ...extra,
});

const last = <T>(values: T[], offset = 1): T => values[values.length - offset];

describe('computeAdminStats', () => {
    it('starts weeks on monday, last period is current one', () => {
        const stats = computeAdminStats(emptyData(), 'week', now);

        assert.strictEqual(new Date(last(stats.starts)).getUTCDay(), 1);
        assert.strictEqual(last(stats.starts), thisWeek);
        assert.strictEqual(stats.starts.length, 105);
    });

    it('counts distinct active players, guests and games by type, aborted games excluded', () => {
        const data = emptyData();

        data.players.set(1, { isGuest: false, createdAt: 0, registeredAt: 0 });
        data.players.set(2, { isGuest: true, createdAt: 0, registeredAt: null });
        data.players.set(3, { isGuest: true, createdAt: 0, registeredAt: null });
        data.humanGames.push(
            game(thisWeek + DAY, [1, 2]),
            game(thisWeek + DAY + 1, [1, 2], { live: false, rematched: true }),
            game(thisWeek + DAY + 2, [1, 3], { movesCount: 2 }),
        );

        const { metrics } = computeAdminStats(data, 'week', now);

        // Player 3 only played an aborted game
        assert.strictEqual(last(metrics.activePlayers.values), 2);
        assert.strictEqual(last(metrics.activeAccounts.values), 1);
        assert.strictEqual(last(metrics.activeGuests.values), 1);
        assert.strictEqual(last(metrics.liveGames.values), 1);
        assert.strictEqual(last(metrics.correspondenceGames.values), 1);
        assert.strictEqual(last(metrics.rematchRate.values), 1 / 2);
        assert.strictEqual(last(metrics.abortedRate.values), 1 / 3);
    });

    it('computes retention by first game date, only when enough time elapsed', () => {
        const data = emptyData();
        const firstGame = thisWeek - 10 * 7 * DAY;

        for (const id of [1, 2, 3, 4, 5, 6, 1000]) {
            data.players.set(id, { isGuest: true, createdAt: 0, registeredAt: null });
        }

        // 1 and 2 come back 8 days later, then only 2 again 31 days later. 3 and 4 come back 10 weeks later
        data.humanGames.push(
            game(firstGame, [1, 2]),
            game(firstGame + 1, [3, 4]),
            game(firstGame + 8 * DAY, [1, 2]),
            game(firstGame + 31 * DAY, [2, 1000]),
            game(lastWeek + DAY, [5, 6]),
            game(thisWeek + DAY, [3, 4]),
        );

        const { metrics } = computeAdminStats(data, 'week', now);
        const count = metrics.firstGamePlayers.values.length;
        const i = count - 11;

        assert.strictEqual(metrics.firstGamePlayers.values[i], 4);
        assert.strictEqual(metrics.retentionD7.values[i], 4 / 4);
        assert.strictEqual(metrics.retentionD30.values[i], 3 / 4);

        // Player 1000 first game, never came back
        assert.strictEqual(metrics.firstGamePlayers.values[count - 7], 1);
        assert.strictEqual(metrics.retentionD30.values[count - 7], 0);

        // Not enough time elapsed for players 5 and 6
        assert.strictEqual(metrics.firstGamePlayers.values[count - 2], 2);
        assert.strictEqual(metrics.retentionD7.values[count - 2], null);
    });

    it('computes lobby stats: first minute join, waiting time, hosts who found a game', () => {
        const data = emptyData();
        const t = lastWeek + DAY;

        data.lobbyGames.push(
            // Host 1 joined after 30s
            { hostId: 1, createdAt: t, closedAt: t + 30000, accepted: true },
            // Host 2 cancels after 2 minutes, recreates a game, cancels it, then joins another game
            { hostId: 2, createdAt: t + 10 * MINUTE, closedAt: t + 12 * MINUTE, accepted: false },
            { hostId: 2, createdAt: t + 13 * MINUTE, closedAt: t + 20 * MINUTE, accepted: false },
            // Host 3 never found a game
            { hostId: 3, createdAt: t + 60 * MINUTE, closedAt: t + 70 * MINUTE, accepted: false },
        );

        data.players.set(2, { isGuest: true, createdAt: 0, registeredAt: null });
        data.players.set(4, { isGuest: true, createdAt: 0, registeredAt: null });
        data.humanGames.push(game(t + 40 * MINUTE, [4, 2], { startedAt: t + 21 * MINUTE }));

        const { metrics } = computeAdminStats(data, 'week', now);
        const i = metrics.lobbyGames.values.length - 2;

        assert.strictEqual(metrics.lobbyGames.values[i], 4);
        assert.strictEqual(metrics.lobbyAccepted.values[i], 1 / 4);
        assert.strictEqual(metrics.lobbyJoinedFirstMinute.values[i], 1 / 4);
        assert.strictEqual(metrics.lobbyWaitMedian.values[i], 30000);

        // 3 sessions: host 1, host 2 (2 games), host 3
        assert.strictEqual(metrics.lobbyHostsFoundGame.n![i], 3);
        assert.strictEqual(metrics.lobbyHostsFoundGame.values[i], 2 / 3);

        // Waiting: 30s + 2min + 7min + 10min
        const waiting = 30000 + 19 * MINUTE;
        assert.ok(Math.abs(metrics.lobbyNotEmpty.values[i]! - waiting / (7 * DAY)) < 1e-12);
    });

    it('computes activation and conversion', () => {
        const data = emptyData();
        const day = thisWeek;

        data.newPlayersByDay.push([day, 10, 2]);
        data.newPlayingGuestsByDay.push([day, 4]);
        data.guestUpgradesByDay.push([day + DAY, 1]);

        // Guest 1 plays within 24h, then registers. Account 2 plays 2 days later
        data.players.set(1, { isGuest: false, createdAt: day + 1000, registeredAt: day + 2 * DAY });
        data.players.set(2, { isGuest: false, createdAt: day + 2000, registeredAt: day + 2000 });
        data.players.set(3, { isGuest: false, createdAt: 0, registeredAt: 0 });
        data.humanGames.push(game(day + 2 * 3600 * 1000, [1, 3]));
        data.humanGames.push(game(day + 2 * DAY + 3600 * 1000, [2, 1]));

        const { metrics } = computeAdminStats(data, 'week', now);

        assert.strictEqual(last(metrics.newGuests.values), 10);
        assert.strictEqual(last(metrics.newAccounts.values), 2);
        assert.strictEqual(last(metrics.guestUpgrades.values), 1);
        assert.strictEqual(last(metrics.newPlayingGuests.values), 4);
        assert.strictEqual(last(metrics.activationGuests.values), 1 / 4);
        assert.strictEqual(last(metrics.activationAccounts.values), 0);
        assert.strictEqual(last(metrics.guestConversion.values), 1);
    });
});
