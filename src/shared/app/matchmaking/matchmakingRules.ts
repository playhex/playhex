/**
 * Matchmaking business rules, as pure functions.
 * Used by server to pair players, and by frontend to display preferences.
 */

import type TimeControlType from '../../time-control/TimeControlType.js';
import { calcAverageSecondsPerMove } from '../timeControlUtils.js';

/**
 * - yes: I accept this option
 * - heart: if I have the choice, I prefer this option
 * - no: I refuse this option, never play it
 */
export const matchmakingChoices = ['yes', 'heart', 'no'] as const;

export type MatchmakingChoice = typeof matchmakingChoices[number];

export const MATCHMAKING_MIN_BOARDSIZE = 11;
export const MATCHMAKING_MAX_BOARDSIZE = 19;

export const matchmakingBoardsizes: number[] = Array.from(
    { length: MATCHMAKING_MAX_BOARDSIZE - MATCHMAKING_MIN_BOARDSIZE + 1 },
    (_, i) => MATCHMAKING_MIN_BOARDSIZE + i,
);

/**
 * Choice for each boardsize, e.g { 11: 'yes', 13: 'heart' }.
 * Missing boardsize means 'no'.
 */
export type MatchmakingPreferences = {
    boardsizes: { [boardsize: number]: MatchmakingChoice };
};

export const createDefaultMatchmakingPreferences = (): MatchmakingPreferences => ({
    boardsizes: { 11: 'yes', 12: 'yes', 13: 'yes', 14: 'yes' },
});

export const getBoardsizeChoice = (preferences: MatchmakingPreferences, boardsize: number): MatchmakingChoice =>
    preferences.boardsizes[boardsize] ?? 'no';

/**
 * Next state when clicking on a boardsize checkbox: yes => heart => no => yes
 */
export const nextMatchmakingChoice = (choice: MatchmakingChoice): MatchmakingChoice => {
    switch (choice) {
        case 'yes': return 'heart';
        case 'heart': return 'no';
        case 'no': return 'yes';
    }
};

export const acceptedBoardsizes = (preferences: MatchmakingPreferences): number[] =>
    matchmakingBoardsizes.filter(boardsize => getBoardsizeChoice(preferences, boardsize) !== 'no');

export const acceptsBoardsize = (preferences: MatchmakingPreferences, boardsize: number): boolean =>
    getBoardsizeChoice(preferences, boardsize) !== 'no';

/**
 * Whether preferences object is well formed and accepts at least one boardsize.
 */
export const isValidMatchmakingPreferences = (preferences: unknown): preferences is MatchmakingPreferences => {
    if (typeof preferences !== 'object' || preferences === null) {
        return false;
    }

    const { boardsizes } = preferences as { boardsizes?: unknown };

    if (typeof boardsizes !== 'object' || boardsizes === null || Array.isArray(boardsizes)) {
        return false;
    }

    for (const [key, value] of Object.entries(boardsizes)) {
        if (!matchmakingBoardsizes.includes(Number(key))) {
            return false;
        }

        if (!(matchmakingChoices as readonly unknown[]).includes(value)) {
            return false;
        }
    }

    return acceptedBoardsizes({ boardsizes } as MatchmakingPreferences).length > 0;
};

/**
 * Keep only known boardsizes and choices, drop 'no' (implicit).
 */
export const normalizeMatchmakingPreferences = (preferences: MatchmakingPreferences): MatchmakingPreferences => {
    const boardsizes: MatchmakingPreferences['boardsizes'] = {};

    for (const boardsize of matchmakingBoardsizes) {
        const choice = getBoardsizeChoice(preferences, boardsize);

        if (choice !== 'no') {
            boardsizes[boardsize] = choice;
        }
    }

    return { boardsizes };
};

/**
 * Time control of a matchmaking game, depends on boardsize.
 */
export const getMatchmakingTimeControl = (boardsize: number): TimeControlType => boardsize <= 15
    ? { family: 'fischer', options: { initialTime: 5 * 60_000, timeIncrement: 5_000 } }
    : { family: 'fischer', options: { initialTime: 7 * 60_000, timeIncrement: 7_000 } }
;

export const commonBoardsizes = (a: MatchmakingPreferences, b: MatchmakingPreferences): number[] =>
    matchmakingBoardsizes.filter(boardsize => acceptsBoardsize(a, boardsize) && acceptsBoardsize(b, boardsize));

/**
 * Two players can be paired if they have at least one boardsize in common.
 * A player is never paired on a boardsize he refused.
 */
export const isMatchmakingCompatible = (a: MatchmakingPreferences, b: MatchmakingPreferences): boolean =>
    commonBoardsizes(a, b).length > 0;

/**
 * - both_hearts: boardsize is hearted by both players
 * - one_heart: hearted by one player only
 * - common: accepted by both, hearted by none
 */
export type BoardsizePickTier = 'both_hearts' | 'one_heart' | 'common';

/**
 * Pick boardsize for a matchmaking game, by tiers:
 * boardsizes hearted by both, else hearted by one, else any common boardsize.
 * Random among the selected tier.
 *
 * @returns null if players are not compatible
 */
export const pickMatchmakingBoardsize = (
    a: MatchmakingPreferences,
    b: MatchmakingPreferences,
    random: () => number = Math.random,
): null | { boardsize: number, tier: BoardsizePickTier } => {
    const common = commonBoardsizes(a, b);

    if (common.length === 0) {
        return null;
    }

    const hearts = (boardsize: number): number =>
        (getBoardsizeChoice(a, boardsize) === 'heart' ? 1 : 0)
        + (getBoardsizeChoice(b, boardsize) === 'heart' ? 1 : 0)
    ;

    const tiers: [BoardsizePickTier, number[]][] = [
        ['both_hearts', common.filter(boardsize => hearts(boardsize) === 2)],
        ['one_heart', common.filter(boardsize => hearts(boardsize) === 1)],
        ['common', common],
    ];

    for (const [tier, boardsizes] of tiers) {
        if (boardsizes.length > 0) {
            return {
                boardsize: boardsizes[Math.floor(random() * boardsizes.length)],
                tier,
            };
        }
    }

    return null;
};

/**
 * A game created in lobby can be joined by a matchmaking player
 * if its time control is close enough to the matchmaking one.
 */
export const MATCHMAKING_TIME_CONTROL_MIN_RATIO = 0.6;
export const MATCHMAKING_TIME_CONTROL_MAX_RATIO = 1.6;

/**
 * Ratio between average seconds per move of a time control,
 * and the one of the matchmaking time control for this boardsize.
 */
export const matchmakingTimeControlRatio = (timeControlType: TimeControlType, boardsize: number): number =>
    calcAverageSecondsPerMove({ timeControlType, boardsize })
    / calcAverageSecondsPerMove({ timeControlType: getMatchmakingTimeControl(boardsize), boardsize })
;

export const isTimeControlCloseToMatchmaking = (timeControlType: TimeControlType, boardsize: number): boolean => {
    const ratio = matchmakingTimeControlRatio(timeControlType, boardsize);

    return ratio >= MATCHMAKING_TIME_CONTROL_MIN_RATIO
        && ratio <= MATCHMAKING_TIME_CONTROL_MAX_RATIO
    ;
};

/*
 * Rush hour: when most players are online,
 * displayed to players to gather them at the same time.
 */
export const MATCHMAKING_RUSH_HOUR_START_UTC = 17;
export const MATCHMAKING_RUSH_HOUR_END_UTC = 21;

/**
 * @returns Next or current rush hour period.
 */
export const getRushHour = (now: Date): { start: Date, end: Date, ongoing: boolean } => {
    const start = new Date(now);
    start.setUTCHours(MATCHMAKING_RUSH_HOUR_START_UTC, 0, 0, 0);

    const end = new Date(now);
    end.setUTCHours(MATCHMAKING_RUSH_HOUR_END_UTC, 0, 0, 0);

    if (now >= end) {
        start.setUTCDate(start.getUTCDate() + 1);
        end.setUTCDate(end.getUTCDate() + 1);
    }

    return { start, end, ongoing: now >= start && now < end };
};

/**
 * Streak: number of consecutive UTC days with at least one matchmaking game,
 * until today, or yesterday (streak still alive if not played yet today).
 *
 * @param days Days with at least one matchmaking game, as "YYYY-MM-DD", any order.
 */
export const calcMatchmakingStreak = (days: string[], now: Date): number => {
    const set = new Set(days);
    const day = new Date(now);
    const toKey = (date: Date) => date.toISOString().substring(0, 10);

    if (!set.has(toKey(day))) {
        day.setUTCDate(day.getUTCDate() - 1);
    }

    let streak = 0;

    while (set.has(toKey(day))) {
        ++streak;
        day.setUTCDate(day.getUTCDate() - 1);
    }

    return streak;
};

/**
 * Current matchmaking search state of a player
 */
export type MatchmakingStatus = {
    /** Timestamp in ms */
    enteredAt: number;
    preferences: MatchmakingPreferences;
};

/*
 * Logs
 */
export type MatchmakingEventType = 'enter' | 'leave' | 'match';

export type MatchmakingLeaveReason =
    /** Player clicked cancel */
    | 'cancel'

    /** Offline for too long */
    | 'offline'

    /** Started another game */
    | 'other_game'
;

/**
 * - queue: two waiting players paired together, game created for them
 * - lobby_game: waiting player joined a game created in lobby
 */
export type MatchmakingMatchSource = 'queue' | 'lobby_game';
