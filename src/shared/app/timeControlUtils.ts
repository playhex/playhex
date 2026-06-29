import { t } from 'i18next';
import TimeControlType from '../time-control/TimeControlType.js';
import { TimeControlBoardsize } from './models/TimeControlBoardsize.js';
import PlayerFavoriteTimeControl from './models/PlayerFavoriteTimeControl.js';

/**
 * Returns average seconds per move
 * for a given time control and a board size.
 */
export const calcAverageSecondsPerMove = (timeControlBoardsize: TimeControlBoardsize): number => {
    /**
     * "A typical hex game fills about one-third of the board."
     *      -- from https://trmph.com/hexwiki/Basic_strategy_guide.html
     *
     * Another relevant thread:
     * https://littlegolem.net/jsp/forum/topic2.jsp?forum=50&topic=809
     */
    const averageMoves = timeControlBoardsize.boardsize ** 2 / 6;

    const { family: type, options } = timeControlBoardsize.timeControlType;

    switch (type) {
        case 'fischer':
            return (options.initialTime / 1000) / averageMoves
                + (options.timeIncrement ?? 0) / 1000;

        case 'byoyomi':
            return (options.initialTime / 1000) / averageMoves
                + (options.periodsCount > 0
                    ? (options.periodsCount - 1) * (options.periodTime / 1000) / averageMoves + options.periodTime / 1000
                    : 0
                )
            ;
    }
};

/**
 * Separate families of cadencies, as separated on loby
 */
export type TimeControlCadency = 'live' | 'correspondence';

/**
 * Cadencies as separated for icons, which makes a distinction between live-normal and live-blitz
 */
export type TimeControlCadencyName = 'blitz' | 'normal' | 'correspondence';

/**
 * Naive function that guess if a game is a blitz or correspondence
 * given its time control and board size.
 */
export const timeControlToCadencyName = (timeControlBoardsize: TimeControlBoardsize): TimeControlCadencyName => {
    if (timeControlBoardsize.timeControlType.options.initialTime >= 86400000) {
        return 'correspondence';
    }

    const averageSecondsPerMove = calcAverageSecondsPerMove(timeControlBoardsize);

    // wet finger technique
    if (averageSecondsPerMove < 10) {
        return 'blitz';
    }

    return 'normal';
};

/**
 * Whether a game is playing live (or blitz), not correspondence
 */
export const isLive = (timeControlBoardsize: TimeControlBoardsize): boolean => {
    return timeControlToCadencyName(timeControlBoardsize) !== 'correspondence';
};

/**
 * Whether a game is playing correspondence
 */
export const isCorrespondence = (timeControlBoardsize: TimeControlBoardsize): boolean => {
    return timeControlToCadencyName(timeControlBoardsize) === 'correspondence';
};

/**
 * Show seconds like time. For in game elapsing time.
 * "5:02", "1h06", "1d 5h"
 *
 * Cannot be called server-side because of the need of unit translations.
 */
export const msToTime = (ms: number): string => {
    const { floor } = Math;

    const parts = [];

    parts.push(floor(ms / 86400000));
    ms -= parts[0] * 86400000;
    parts.push(floor(ms / 3600000));
    ms -= parts[1] * 3600000;
    parts.push(floor(ms / 60000));
    ms -= parts[2] * 60000;
    parts.push(floor(ms / 1000));

    if (parts[0] > 0) {
        return parts[1] > 0
            ? `${parts[0]}${t('short_time_unit.day')} ${parts[1]}${t('short_time_unit.hour')}`
            : `${parts[0]}${t('short_time_unit.day')}`
        ;
    }

    if (parts[1] > 0) {
        return parts[2] > 0
            ? `${parts[1]}${t('short_time_unit.hour')}${String(parts[2]).padStart(2, '0')}`
            : `${parts[1]}${t('short_time_unit.hour')}`
        ;
    }

    return `${parts[2]}:${String(parts[3]).padStart(2, '0')}`;
};

/**
 * Show seconds like duration. For lobby or time increments.
 * "5min", "1h", "1d12h"
 *
 * Cannot be called server-side because of the need of unit translations.
 */
export const msToDuration = (ms: number, precision = 2): string => {
    if (ms <= 0) {
        return '0';
    }

    const { floor } = Math;

    const parts = [];

    parts.push(floor(ms / 86400000));
    ms -= parts[0] * 86400000;
    parts.push(floor(ms / 3600000));
    ms -= parts[1] * 3600000;
    parts.push(floor(ms / 60000));
    ms -= parts[2] * 60000;
    parts.push(floor(ms / 1000));

    const tokens = [];

    if (parts[0] > 0) {
        tokens.push(parts[0] + t('short_time_unit.day'));
    }

    if (parts[1] > 0) {
        tokens.push(parts[1] + t('short_time_unit.hour'));
    }

    if (parts[2] > 0) {
        tokens.push(parts[2] + t('short_time_unit.minute'));
    }

    if (parts[3] > 0) {
        tokens.push(parts[3] + t('short_time_unit.second'));
    }

    return tokens.slice(0, precision).join('');
};

export const DAY_MS = 86400 * 1000;

const twoWeeks = DAY_MS * 14;

/**
 * Cannot be called server-side because of the need of unit translations.
 */
export const timeControlToString = (timeControl: TimeControlType): string => {
    switch (timeControl.family) {
        case 'fischer': {
            const { initialTime, timeIncrement, maxTime } = timeControl.options;

            let string = msToDuration(initialTime);

            if (timeIncrement) {
                string += ' + ' + msToDuration(timeIncrement);
            }

            // Show "capped" when maxTime <= 14d, i.e explicitely defined by user and not by system max time.
            if (undefined !== maxTime && maxTime <= twoWeeks) {
                string += ' ' + t('time_control.capped_abbreviation');

                if (maxTime !== initialTime) {
                    string += ' ' + msToDuration(maxTime);
                }
            }

            return string;
        }

        case 'byoyomi': {
            const { initialTime, periodsCount, periodTime } = timeControl.options;
            let string = msToDuration(initialTime);

            if (periodTime && periodsCount) {
                string += ` + ${periodsCount} × ${msToDuration(periodTime)}`;
            }

            return string;
        }
    }
};

export const isSameTimeControlType = (a: TimeControlType, b: TimeControlType): boolean => {
    if (a.family === 'fischer' && b.family === 'fischer') {
        return a.options.initialTime === b.options.initialTime
            && a.options.maxTime === b.options.maxTime
            && (a.options.timeIncrement ?? 0) === (b.options.timeIncrement ?? 0)
        ;
    }

    if (a.family === 'byoyomi' && b.family === 'byoyomi') {
        return a.options.initialTime === b.options.initialTime
            && a.options.periodTime === b.options.periodTime
            && a.options.periodsCount === b.options.periodsCount
        ;
    }

    return false;
};

/**
 * Set replace time control from another time control
 */
export const assignTimeControlType = (target: TimeControlType, source: TimeControlType): TimeControlType => {
    target.family = source.family;
    target.options = Object.assign({}, source.options);

    return target;
};

export const liveInitialTimeSteps: number[] = [
    5 * 1000,
    10 * 1000,
    15 * 1000,
    30 * 1000,
    45 * 1000,
    60 * 1000,
    90 * 1000,
    60 * 2 * 1000,
    60 * 3 * 1000,
    60 * 4 * 1000,
    60 * 5 * 1000,
    60 * 7 * 1000,
    60 * 10 * 1000,
    60 * 12 * 1000,
    60 * 15 * 1000,
    60 * 20 * 1000,
    60 * 25 * 1000,
    60 * 30 * 1000,
    60 * 40 * 1000,
    60 * 45 * 1000,
    60 * 60 * 1000,
    60 * 75 * 1000,
    60 * 90 * 1000,
    60 * 120 * 1000,
    60 * 150 * 1000,
    60 * 180 * 1000,
];

export const correspondenceInitialTimeSteps: number[] = [
    86400 * 1 * 1000,
    86400 * 2 * 1000,
    86400 * 3 * 1000,
    86400 * 5 * 1000,
    86400 * 7 * 1000,
    86400 * 10 * 1000,
    86400 * 14 * 1000,
];

export const liveSecondaryTimeSteps: number[] = [
    0 * 1000,
    1 * 1000,
    2 * 1000,
    3 * 1000,
    4 * 1000,
    5 * 1000,
    6 * 1000,
    7 * 1000,
    8 * 1000,
    9 * 1000,
    10 * 1000,
    12 * 1000,
    15 * 1000,
    20 * 1000,
    25 * 1000,
    30 * 1000,
    40 * 1000,
    45 * 1000,
    60 * 1000,
    75 * 1000,
    90 * 1000,
    120 * 1000,
    150 * 1000,
    180 * 1000,
];

export const correspondenceSecondaryTimeSteps: number[] = [
    86400 * 1 * 1000,
    86400 * 2 * 1000,
    86400 * 3 * 1000,
    86400 * 5 * 1000,
    86400 * 7 * 1000,
    86400 * 10 * 1000,
    86400 * 14 * 1000,
];

/**
 * Min number of periods allowed for byo yomi
 */
export const BYO_YOMI_PERIODS_MIN = 1;

/**
 * Max number of periods allowed for byo yomi
 */
export const BYO_YOMI_PERIODS_MAX = 15;

/**
 * Default time controls suggested on time control configuration
 */
export const defaultTimeControlTypes: {
    // can add/modify keys.
    // "as const" prevent typecheking,
    // and [key: string] prevent autocomplete of "fast", ...
    fast: TimeControlType;
    normal: TimeControlType;
    long: TimeControlType;
    correspondenceFast: TimeControlType;
    correspondenceNormal: TimeControlType;
    correspondenceLong: TimeControlType;
} = {
    fast: {
        family: 'fischer',
        options: {
            initialTime: 2 * 60 * 1000,
            timeIncrement: 5 * 1000,
        },
    },
    normal: {
        family: 'fischer',
        options: {
            initialTime: 5 * 60 * 1000,
            timeIncrement: 10 * 1000,
        },
    },
    long: {
        family: 'fischer',
        options: {
            initialTime: 10 * 60 * 1000,
            timeIncrement: 20 * 1000,
        },
    },
    correspondenceFast: {
        family: 'fischer',
        options: {
            initialTime: 3 * DAY_MS,
            timeIncrement: DAY_MS,
            maxTime: 3 * DAY_MS,
        },
    },
    correspondenceNormal: {
        family: 'fischer',
        options: {
            initialTime: 5 * DAY_MS,
            timeIncrement: DAY_MS,
            maxTime: 5 * DAY_MS,
        },
    },
    correspondenceLong: {
        family: 'fischer',
        options: {
            initialTime: 7 * DAY_MS,
            timeIncrement: 2 * DAY_MS,
            maxTime: 7 * DAY_MS,
        },
    },
};

const livePresetName = (key: 'fast' | 'normal' | 'long', tc: TimeControlType): string => {
    const opts = tc.options as { initialTime: number, timeIncrement?: number };
    const mins = Math.round(opts.initialTime / 60000);
    const secs = Math.round((opts.timeIncrement ?? 0) / 1000);
    return secs > 0 ? `${t(`time_control.${key}`)} ${mins} + ${secs}` : `${t(`time_control.${key}`)} ${mins}`;
};

export const getDefaultFavoriteTimeControls = (): PlayerFavoriteTimeControl[] => [
    { name: livePresetName('fast', defaultTimeControlTypes.fast), cadency: 'live', timeControlType: defaultTimeControlTypes.fast, order: 0 },
    { name: livePresetName('normal', defaultTimeControlTypes.normal), cadency: 'live', timeControlType: defaultTimeControlTypes.normal, order: 1 },
    { name: livePresetName('long', defaultTimeControlTypes.long), cadency: 'live', timeControlType: defaultTimeControlTypes.long, order: 2 },
    { name: null, cadency: 'correspondence', timeControlType: defaultTimeControlTypes.correspondenceFast, order: 3 },
    { name: null, cadency: 'correspondence', timeControlType: defaultTimeControlTypes.correspondenceNormal, order: 4 },
    { name: null, cadency: 'correspondence', timeControlType: defaultTimeControlTypes.correspondenceLong, order: 5 },
];

/**
 * Get step number from initialTime within the given steps array.
 * If not a predefined step, returns the nearest one.
 */
export const getInitialTimeStep = (timeControlType: TimeControlType, steps: number[]): number => {
    const { initialTime } = timeControlType.options;

    let step = steps.findIndex(t => t === initialTime);

    if (step < 0) {
        while (steps[step] < initialTime) {
            ++step;
        }
    }

    return step;
};

/**
 * Get step number from secondaryTime within the given steps array.
 * If not a predefined step, returns the nearest one.
 */
export const getSecondaryTimeStep = (timeControlType: TimeControlType, steps: number[]): number => {
    const { family, options } = timeControlType;
    const secondaryTime = family === 'fischer'
        ? (options.timeIncrement ?? 0)
        : options.periodTime
    ;

    let step = steps.findIndex(t => t === secondaryTime);

    if (step < 0) {
        while (steps[step] < secondaryTime) {
            ++step;
        }
    }

    return step;
};
