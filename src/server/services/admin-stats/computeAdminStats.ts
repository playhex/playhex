import { ADMIN_STATS_PLAYED_MIN_MOVES, type AdminStatsHumanGame, type AdminStatsRawData } from '../../repositories/AdminStatsRepository.js';
import { kaplanMeier } from '../lobbyWaitStats.js';

export const ADMIN_STATS_PERIODS = ['day', 'week', '28d'] as const;

export type AdminStatsPeriod = typeof ADMIN_STATS_PERIODS[number];

/**
 * Values by period, null when not available.
 * `n` is the number of items the value is computed from (players, games...),
 * to know whether value is reliable.
 */
export type AdminStatsMetric = {
    values: (null | number)[];
    n?: number[];
};

export type AdminStats = {
    period: AdminStatsPeriod;
    computedAt: number;

    /** Start of each period (UTC), oldest first */
    starts: number[];

    /** Before this date, canceled lobby games were not tracked, so lobby stats are overestimated */
    lobbyBiasedBefore: number;

    metrics: Record<string, AdminStatsMetric>;
};

const DAY = 86400 * 1000;
const MINUTE = 60 * 1000;

export const ADMIN_STATS_HISTORY_MS = 2 * 365 * DAY;

const PERIOD_MS: Record<AdminStatsPeriod, number> = {
    day: DAY,
    week: 7 * DAY,
    '28d': 28 * DAY,
};

/**
 * A monday, so that weeks and 28 days periods start on monday (UTC).
 */
const PERIODS_ANCHOR = Date.UTC(1970, 0, 5);

const LOBBY_BIASED_BEFORE = Date.UTC(2025, 8, 18, 12);

const FIRST_MINUTE_MS = MINUTE;

/**
 * Games with less moves are aborted, not really played,
 * so not counted in activity, activation, retention.
 */
const isPlayed = (game: AdminStatsHumanGame): boolean => game.movesCount >= ADMIN_STATS_PLAYED_MIN_MOVES;

/** A new player is activated if he finished a game against a human within this delay after creation */
const ACTIVATION_DELAY_MS = DAY;

/** Monthly active players, for DAU/MAU */
const MAU_DAYS = 28;

/**
 * A host creating a new lobby game within this delay after his previous one has been canceled
 * is still in same session, still trying to play.
 */
const LOBBY_SESSION_GAP_MS = 10 * MINUTE;

/**
 * Host found a game if he started a game within this delay after his last lobby game left lobby,
 * e.g he canceled his game to join another host's game.
 */
const LOBBY_SESSION_FOUND_DELAY_MS = 5 * MINUTE;

export const periodStart = (t: number, period: AdminStatsPeriod): number => {
    const length = PERIOD_MS[period];

    return PERIODS_ANCHOR + Math.floor((t - PERIODS_ANCHOR) / length) * length;
};

const median = (values: number[]): null | number => {
    if (values.length === 0) {
        return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Lists of players' human games end dates, sorted.
 */
const getPlayersGamesEnds = (data: AdminStatsRawData): Map<number, number[]> => {
    const gamesEnds = new Map<number, number[]>();

    // Games are sorted by endedAt
    for (const game of data.humanGames) {
        if (!isPlayed(game)) {
            continue;
        }

        for (const playerId of game.playerIds) {
            let ends = gamesEnds.get(playerId);

            if (ends === undefined) {
                ends = [];
                gamesEnds.set(playerId, ends);
            }

            ends.push(game.endedAt);
        }
    }

    return gamesEnds;
};

/**
 * Lists of dates players started a live game against a human, sorted.
 */
const getPlayersLiveGamesStarts = (data: AdminStatsRawData): Map<number, number[]> => {
    const starts = new Map<number, number[]>();
    const add = (playerId: number, t: number) => {
        let list = starts.get(playerId);

        if (list === undefined) {
            list = [];
            starts.set(playerId, list);
        }

        list.push(t);
    };

    for (const game of data.humanGames) {
        if (game.live && game.startedAt !== null) {
            add(game.playerIds[0], game.startedAt);
            add(game.playerIds[1], game.startedAt);
        }
    }

    // Accepted lobby games that are still playing are not in human games
    for (const game of data.lobbyGames) {
        if (game.accepted) {
            add(game.hostId, game.closedAt);
        }
    }

    for (const list of starts.values()) {
        list.sort((a, b) => a - b);
    }

    return starts;
};

const hasValueBetween = (sorted: undefined | number[], from: number, to: number): boolean => {
    if (sorted === undefined) {
        return false;
    }

    // Binary search of first value >= from
    let lo = 0;
    let hi = sorted.length;

    while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (sorted[mid] < from) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    return lo < sorted.length && sorted[lo] <= to;
};

/**
 * Created as guest, then maybe upgraded later.
 */
const createdAsGuest = (player: { createdAt: number, registeredAt: null | number }): boolean =>
    player.registeredAt === null || player.registeredAt > player.createdAt + MINUTE;

/**
 * Computes all admin stats, for one period length.
 *
 * Data used:
 * - active players, games: finished games, by end date, only played ones (not aborted),
 * - activation: players by creation date,
 * - conversion, retention: players by date of their first finished game against a human,
 * - lobby: lobby games by creation date.
 */
export const computeAdminStats = (data: AdminStatsRawData, period: AdminStatsPeriod, now: number): AdminStats => {
    const length = PERIOD_MS[period];
    const first = periodStart(now - ADMIN_STATS_HISTORY_MS, period);
    const count = (periodStart(now, period) - first) / length + 1;
    const starts = Array.from({ length: count }, (_, i) => first + i * length);

    /** Index of period containing t, or null if out of range */
    const indexOf = (t: number): null | number => {
        const i = Math.floor((t - first) / length);

        return i >= 0 && i < count ? i : null;
    };

    const counter = (): number[] => Array.from({ length: count }, () => 0);
    const lists = <T>(): T[][] => Array.from({ length: count }, () => []);

    const countMetric = (values: number[]): AdminStatsMetric => ({ values });

    const ratioMetric = (num: number[], den: number[], isComplete: (i: number) => boolean = () => true): AdminStatsMetric => ({
        values: num.map((x, i) => den[i] > 0 && isComplete(i) ? x / den[i] : null),
        n: den,
    });

    const metrics: Record<string, AdminStatsMetric> = {};

    /*
     * Activity
     */
    const activePlayers = lists<number>().map(() => new Set<number>());
    const liveGames = counter();
    const correspondenceGames = counter();
    const rematched = counter();
    const aborted = counter();
    const finishedGames = counter();

    for (const game of data.humanGames) {
        const i = indexOf(game.endedAt);

        if (i === null) {
            continue;
        }

        ++finishedGames[i];

        if (!isPlayed(game)) {
            ++aborted[i];
            continue;
        }

        activePlayers[i].add(game.playerIds[0]);
        activePlayers[i].add(game.playerIds[1]);

        ++(game.live ? liveGames : correspondenceGames)[i];

        if (game.rematched) {
            ++rematched[i];
        }
    }

    const activeGuests = activePlayers.map(players => [...players].filter(id => data.players.get(id)?.isGuest).length);

    metrics.activePlayers = countMetric(activePlayers.map(players => players.size));
    metrics.activeAccounts = countMetric(activePlayers.map((players, i) => players.size - activeGuests[i]));
    metrics.activeGuests = countMetric(activeGuests);
    metrics.liveGames = countMetric(liveGames);
    metrics.correspondenceGames = countMetric(correspondenceGames);

    const botGames = counter();

    for (const [day, n] of data.botGamesByDay) {
        const i = indexOf(day);

        if (i !== null) {
            botGames[i] += n;
        }
    }

    metrics.botGames = countMetric(botGames);

    /*
     * Acquisition and activation
     */
    const newGuests = counter();
    const newPlayingGuests = counter();
    const newAccounts = counter();
    const guestUpgrades = counter();

    for (const [day, guests, accounts] of data.newPlayersByDay) {
        const i = indexOf(day);

        if (i !== null) {
            newGuests[i] += guests;
            newAccounts[i] += accounts;
        }
    }

    for (const [day, n] of data.newPlayingGuestsByDay) {
        const i = indexOf(day);

        if (i !== null) {
            newPlayingGuests[i] += n;
        }
    }

    for (const [day, n] of data.guestUpgradesByDay) {
        const i = indexOf(day);

        if (i !== null) {
            guestUpgrades[i] += n;
        }
    }

    metrics.newGuests = countMetric(newGuests);
    metrics.newPlayingGuests = countMetric(newPlayingGuests);
    metrics.newAccounts = countMetric(newAccounts);
    metrics.guestUpgrades = countMetric(guestUpgrades);

    const gamesEnds = getPlayersGamesEnds(data);
    const activatedGuests = counter();
    const activatedAccounts = counter();
    const firstGamePlayers = counter();
    const firstGameGuests = counter();
    const firstGameGuestsUpgraded = counter();
    const retainedD7 = counter();
    const retainedD30 = counter();

    for (const [playerId, ends] of gamesEnds) {
        const player = data.players.get(playerId);

        if (player === undefined) {
            continue;
        }

        const firstEnd = ends[0];
        const lastEnd = ends[ends.length - 1];
        const asGuest = createdAsGuest(player);

        // Activation, by player creation date
        const created = indexOf(player.createdAt);

        if (created !== null && firstEnd <= player.createdAt + ACTIVATION_DELAY_MS) {
            ++(asGuest ? activatedGuests : activatedAccounts)[created];
        }

        // Conversion and retention, by first game date
        const i = indexOf(firstEnd);

        if (i === null) {
            continue;
        }

        ++firstGamePlayers[i];

        if (asGuest) {
            ++firstGameGuests[i];

            if (player.registeredAt !== null) {
                ++firstGameGuestsUpgraded[i];
            }
        }

        if (lastEnd >= firstEnd + 7 * DAY) {
            ++retainedD7[i];
        }

        if (lastEnd >= firstEnd + 30 * DAY) {
            ++retainedD30[i];
        }
    }

    metrics.activationGuests = ratioMetric(activatedGuests, newPlayingGuests);
    metrics.activationAccounts = ratioMetric(activatedAccounts, newAccounts);
    metrics.guestConversion = ratioMetric(firstGameGuestsUpgraded, firstGameGuests);

    /*
     * Retention, only when all players of the period had time to come back
     */
    const isElapsed = (delay: number) => (i: number): boolean => starts[i] + length + delay <= now;

    metrics.firstGamePlayers = countMetric(firstGamePlayers);
    metrics.retentionD7 = ratioMetric(retainedD7, firstGamePlayers, isElapsed(7 * DAY));
    metrics.retentionD30 = ratioMetric(retainedD30, firstGamePlayers, isElapsed(30 * DAY));
    metrics.stickiness = computeStickiness(data, now, starts, indexOf);

    /*
     * Lobby quality
     */
    const lobbyGames = counter();
    const lobbyAccepted = counter();
    const lobbyWaits = lists<[number, 0 | 1]>();
    const lobbyAcceptedWaits = lists<number>();

    for (const game of data.lobbyGames) {
        const i = indexOf(game.createdAt);

        if (i === null) {
            continue;
        }

        const wait = Math.max(0, game.closedAt - game.createdAt);

        ++lobbyGames[i];
        lobbyWaits[i].push([wait, game.accepted ? 1 : 0]);

        if (game.accepted) {
            ++lobbyAccepted[i];
            lobbyAcceptedWaits[i].push(wait);
        }
    }

    metrics.lobbyGames = countMetric(lobbyGames);
    metrics.lobbyAccepted = ratioMetric(lobbyAccepted, lobbyGames);
    metrics.lobbyJoinedFirstMinute = {
        values: lobbyWaits.map(waits => waits.length ? 1 - kaplanMeier(waits)(FIRST_MINUTE_MS) : null),
        n: lobbyWaits.map(waits => waits.length),
    };
    metrics.lobbyWaitMedian = {
        values: lobbyAcceptedWaits.map(median),
        n: lobbyAcceptedWaits.map(waits => waits.length),
    };
    metrics.lobbyNotEmpty = computeLobbyNotEmpty(data, now, starts, length);
    metrics.lobbyHostsFoundGame = computeLobbyHostsFoundGame(data, indexOf, counter);

    /*
     * Game quality
     */
    const playedGames = liveGames.map((n, i) => n + correspondenceGames[i]);
    const ratingGaps = lists<number>();

    for (const [endedAt, gap] of data.rankedRatingGaps) {
        const i = indexOf(endedAt);

        if (i !== null) {
            ratingGaps[i].push(gap);
        }
    }

    metrics.rematchRate = ratioMetric(rematched, playedGames);
    metrics.abortedRate = ratioMetric(aborted, finishedGames);
    metrics.ratingGapMedian = {
        values: ratingGaps.map(median),
        n: ratingGaps.map(gaps => gaps.length),
    };

    return {
        period,
        computedAt: now,
        starts,
        lobbyBiasedBefore: LOBBY_BIASED_BEFORE,
        metrics,
    };
};

/**
 * Average, on all days of period, of daily active players / active players on last 28 days.
 */
const computeStickiness = (
    data: AdminStatsRawData,
    now: number,
    starts: number[],
    indexOf: (t: number) => null | number,
): AdminStatsMetric => {
    const firstDay = periodStart(starts[0], 'day') - MAU_DAYS * DAY;
    const lastDay = periodStart(now, 'day');
    const daysCount = (lastDay - firstDay) / DAY + 1;
    const dailyPlayers = Array.from({ length: daysCount }, () => new Set<number>());

    for (const game of data.humanGames) {
        const d = Math.floor((game.endedAt - firstDay) / DAY);

        if (isPlayed(game) && d >= 0 && d < daysCount) {
            dailyPlayers[d].add(game.playerIds[0]);
            dailyPlayers[d].add(game.playerIds[1]);
        }
    }

    // Sliding window of last MAU_DAYS days
    const inWindow = new Map<number, number>();
    const sums = starts.map(() => 0);
    const days = starts.map(() => 0);

    for (let d = 0; d < daysCount; ++d) {
        for (const id of dailyPlayers[d]) {
            inWindow.set(id, (inWindow.get(id) ?? 0) + 1);
        }

        if (d >= MAU_DAYS) {
            for (const id of dailyPlayers[d - MAU_DAYS]) {
                const n = inWindow.get(id)! - 1;

                if (n === 0) {
                    inWindow.delete(id);
                } else {
                    inWindow.set(id, n);
                }
            }
        }

        const i = indexOf(firstDay + d * DAY);

        // Ignore current day, not finished
        if (i === null || d < MAU_DAYS - 1 || d === daysCount - 1 || inWindow.size === 0) {
            continue;
        }

        sums[i] += dailyPlayers[d].size / inWindow.size;
        ++days[i];
    }

    return {
        values: sums.map((sum, i) => days[i] ? sum / days[i] : null),
        n: days,
    };
};

/**
 * Part of the elapsed time with at least one game waiting in lobby.
 */
const computeLobbyNotEmpty = (data: AdminStatsRawData, now: number, starts: number[], length: number): AdminStatsMetric => {
    const waiting = starts.map(() => 0);
    const first = starts[0];
    const merged: [number, number][] = [];

    // Lobby games are sorted by createdAt
    for (const { createdAt, closedAt } of data.lobbyGames) {
        const last = merged.at(-1);

        if (last && createdAt <= last[1]) {
            last[1] = Math.max(last[1], closedAt);
        } else {
            merged.push([createdAt, closedAt]);
        }
    }

    for (const [from, to] of merged) {
        for (let i = Math.max(0, Math.floor((from - first) / length)); i < starts.length && starts[i] < to; ++i) {
            waiting[i] += Math.max(0, Math.min(to, starts[i] + length) - Math.max(from, starts[i]));
        }
    }

    return {
        values: starts.map((start, i) => {
            const elapsed = Math.min(start + length, now) - start;

            return elapsed > 0 ? waiting[i] / elapsed : null;
        }),
    };
};

/**
 * Hosts sessions (consecutive lobby games created by same host) that ended with a started live game,
 * either his lobby game being accepted, or by joining another game.
 */
const computeLobbyHostsFoundGame = (
    data: AdminStatsRawData,
    indexOf: (t: number) => null | number,
    counter: () => number[],
): AdminStatsMetric => {
    const sessions = counter();
    const found = counter();
    const liveGamesStarts = getPlayersLiveGamesStarts(data);
    const gamesByHost = new Map<number, AdminStatsRawData['lobbyGames']>();

    for (const game of data.lobbyGames) {
        let games = gamesByHost.get(game.hostId);

        if (games === undefined) {
            games = [];
            gamesByHost.set(game.hostId, games);
        }

        games.push(game);
    }

    for (const [hostId, games] of gamesByHost) {
        let k = 0;

        while (k < games.length) {
            const sessionStart = games[k].createdAt;
            let sessionEnd = games[k].closedAt;

            for (++k; k < games.length && games[k].createdAt <= sessionEnd + LOBBY_SESSION_GAP_MS; ++k) {
                sessionEnd = Math.max(sessionEnd, games[k].closedAt);
            }

            const i = indexOf(sessionStart);

            if (i === null) {
                continue;
            }

            ++sessions[i];

            if (hasValueBetween(liveGamesStarts.get(hostId), sessionStart, sessionEnd + LOBBY_SESSION_FOUND_DELAY_MS)) {
                ++found[i];
            }
        }
    }

    return {
        values: found.map((x, i) => sessions[i] ? x / sessions[i] : null),
        n: sessions,
    };
};
