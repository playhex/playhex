import { type LiveLobbyHistoryGame } from '../repositories/LiveLobbyHistoryRepository.js';

/**
 * Only consider games created within this number of hours around current hour (UTC).
 */
const HOUR_WINDOW = 1;

/**
 * Below this number of games, chance to be joined in first minute is not relevant enough to be displayed.
 */
const MIN_GAMES = 50;

/**
 * Below this number of hosts still waiting at the end of the next minutes,
 * chance to be joined in these next minutes is not relevant enough to be displayed.
 */
const MIN_STILL_WAITING = 20;

const FIRST_MINUTE_MS = 60 * 1000;
const NEXT_MINUTES_MS = 10 * 60 * 1000;

export type JoinChances = {
    /**
     * Percent (integer) of hosts joined within first minute.
     */
    firstMinute: null | number;

    /**
     * Percent (integer) of hosts joined within the 10 next minutes,
     * when still not joined after first minute.
     */
    nextTenMinutes: null | number;
};

const hoursDistance = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 24;

    return Math.min(d, 24 - d);
};

/**
 * Kaplan-Meier estimator of the probability that a host is still waiting after `t` ms,
 * would he wait as long as needed.
 *
 * Canceled games are censored: we only know host waited at least until cancel,
 * so they are only removed from hosts still waiting at that time,
 * instead of being counted as "never joined" or ignored.
 *
 * `waits` are [wait duration in ms, 1 if joined else 0 if canceled].
 */
export const kaplanMeier = (waits: [number, 0 | 1][]): (t: number) => number => {
    // Joined before canceled on same duration: canceled host was still waiting at that time
    const sorted = [...waits].sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const steps: [number, number][] = []; // [duration, survival after this duration]
    let atRisk = sorted.length;
    let survival = 1;
    let i = 0;

    while (i < sorted.length) {
        const t = sorted[i][0];
        let joined = 0;
        let canceled = 0;

        for (; i < sorted.length && sorted[i][0] === t; ++i) {
            if (sorted[i][1] === 1) {
                ++joined;
            } else {
                ++canceled;
            }
        }

        if (joined > 0) {
            survival *= 1 - joined / atRisk;
            steps.push([t, survival]);
        }

        atRisk -= joined + canceled;
    }

    return (t: number): number => {
        let s = 1;

        for (const [stepT, stepS] of steps) {
            if (stepT > t) {
                break;
            }

            s = stepS;
        }

        return s;
    };
};

/**
 * Chances to be joined for a game created around `hour` (UTC hour of day).
 * Each value is null when not enough data.
 */
export const computeJoinChances = (games: LiveLobbyHistoryGame[], hour: number): JoinChances => {
    const waits: [number, 0 | 1][] = [];

    for (const [createdAt, closedAt, accepted] of games) {
        if (hoursDistance(new Date(createdAt).getUTCHours(), hour) > HOUR_WINDOW) {
            continue;
        }

        waits.push([Math.max(0, closedAt - createdAt), accepted]);
    }

    if (waits.length < MIN_GAMES) {
        return { firstMinute: null, nextTenMinutes: null };
    }

    const survival = kaplanMeier(waits);
    const afterFirstMinute = survival(FIRST_MINUTE_MS);
    const afterNextMinutes = survival(FIRST_MINUTE_MS + NEXT_MINUTES_MS);
    const stillWaiting = waits.filter(([wait]) => wait > FIRST_MINUTE_MS + NEXT_MINUTES_MS).length;

    return {
        firstMinute: Math.round(100 * (1 - afterFirstMinute)),
        nextTenMinutes: stillWaiting >= MIN_STILL_WAITING && afterFirstMinute > 0
            ? Math.round(100 * (1 - afterNextMinutes / afterFirstMinute))
            : null,
    };
};

/**
 * Join chances for each UTC hour of day (index 0 to 23).
 */
export const computeJoinChancesByUtcHour = (games: LiveLobbyHistoryGame[]): JoinChances[] => {
    return Array.from({ length: 24 }, (_, hour) => computeJoinChances(games, hour));
};
