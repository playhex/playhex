import { type LiveLobbyHistoryGame } from '../repositories/LiveLobbyHistoryRepository.js';

/**
 * Below this number of joined games, typical join time is not relevant enough to be displayed.
 */
const MIN_SAMPLE_SIZE = 10;

/**
 * Only consider games created within this number of hours around current hour (UTC).
 */
const HOUR_WINDOW = 1;

/**
 * Percentile of join times used as "typical" join time.
 * Higher than median to not promise a too short wait.
 */
const PERCENTILE = 0.6;

export type TypicalJoinTime = {
    /**
     * PERCENTILE of join times, in ms.
     */
    joinMs: number;
    sampleSize: number;
};

const hoursDistance = (a: number, b: number): number => {
    const d = Math.abs(a - b) % 24;

    return Math.min(d, 24 - d);
};

/**
 * Time within which most (PERCENTILE) lobby live games have been joined,
 * for games created around `hour` (UTC hour of day).
 *
 * Only accepted games are considered.
 * Returns null if not enough data.
 */
export const computeTypicalJoinTime = (games: LiveLobbyHistoryGame[], hour: number): null | TypicalJoinTime => {
    const joinTimes: number[] = [];

    for (const [createdAt, closedAt, accepted] of games) {
        if (accepted !== 1) {
            continue;
        }

        if (hoursDistance(new Date(createdAt).getUTCHours(), hour) > HOUR_WINDOW) {
            continue;
        }

        joinTimes.push(Math.max(0, closedAt - createdAt));
    }

    if (joinTimes.length < MIN_SAMPLE_SIZE) {
        return null;
    }

    joinTimes.sort((a, b) => a - b);

    // Linear interpolation between closest ranks
    const position = PERCENTILE * (joinTimes.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const joinMs = Math.round(joinTimes[lower] + (joinTimes[upper] - joinTimes[lower]) * (position - lower));

    return {
        joinMs,
        sampleSize: joinTimes.length,
    };
};

/**
 * Typical join time in ms for each UTC hour of day (index 0 to 23), null when not enough data.
 */
export const computeTypicalJoinMsByUtcHour = (games: LiveLobbyHistoryGame[]): (null | number)[] => {
    return Array.from({ length: 24 }, (_, hour) => computeTypicalJoinTime(games, hour)?.joinMs ?? null);
};
