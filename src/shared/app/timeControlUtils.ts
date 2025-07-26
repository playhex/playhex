import { t } from 'i18next';
import TimeControlType from '../time-control/TimeControlType.js';
import { TimeControlBoardsize } from './models/TimeControlBoardsize.js';

/**
 * Returns average seconds per move
 * for a given time control and a board size.
 */
export const calcAverageSecondsPerMove = (timeControlType: TimeControlType, boardsize: number): number => {
    /**
     * "A typical hex game fills about one-third of the board."
     *      -- from https://trmph.com/hexwiki/Basic_strategy_guide.html
     *
     * Another relevant thread:
     * https://littlegolem.net/jsp/forum/topic2.jsp?forum=50&topic=809
     */
    const averageMoves = boardsize ** 2 / 6;

    const { family: type, options } = timeControlType;

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


export type TimeControlCadencyName = 'blitz' | 'normal' | 'correspondence';

/**
 * Naive function that guess if a game is a blitz or correspondence
 * given its time control and board size.
 */
export const timeControlToCadencyName = (timeControlBoardsize: TimeControlBoardsize): TimeControlCadencyName => {
    const averageSecondsPerMove = calcAverageSecondsPerMove(
        timeControlBoardsize.timeControl,
        timeControlBoardsize.boardsize,
    );

    if (averageSecondsPerMove < 10) {
        return 'blitz';
    }

    // wet finger technique
    if (averageSecondsPerMove > 3600) {
        return 'correspondence';
    }

    return 'normal';
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

const twoWeeks = 86400 * 14 * 1000;

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

/**
 * initial time for Fischer and ByoYomi
 */
export const initialTimeSteps: number[] = [
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
    86400 * 1 * 1000,
    86400 * 3 * 1000,
    86400 * 7 * 1000,
    86400 * 14 * 1000,
];

/**
 * time increment for Fischer and period time for ByoYomi
 */
export const secondaryTimeSteps: number[] = [
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
    3600 * 4 * 1000,
    3600 * 8 * 1000,
    3600 * 12 * 1000,
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
} = {
    fast: {
        family: 'fischer',
        options: {
            initialTime: 300 * 1000,
            timeIncrement: 2 * 1000,
        },
    },
    normal: {
        family: 'fischer',
        options: {
            initialTime: 600 * 1000,
            timeIncrement: 5 * 1000,
        },
    },
    long: {
        family: 'fischer',
        options: {
            initialTime: 1800 * 1000,
            timeIncrement: 15 * 1000,
        },
    },
};

/**
 * Get step number from initialTime.
 * If not a predefined step, returns the nearest one.
 */
export const getInitialTimeStep = (timeControlType: TimeControlType): number => {
    const { initialTime } = timeControlType.options;

    let step = Object.values(initialTimeSteps).findIndex(t => t === initialTime);

    if (step < 0) {
        while (initialTimeSteps[step] < initialTime) {
            ++step;
        }
    }

    return step;
};

/**
 * Get step number from secondaryTime.
 * If not a predefined step, returns the nearest one.
 */
export const getSecondaryTimeStep = (timeControlType: TimeControlType): number => {
    const { family, options } = timeControlType;
    const secondaryTime = family === 'fischer'
        ? (options.timeIncrement ?? 0)
        : options.periodTime
    ;

    let step = Object.values(secondaryTimeSteps).findIndex(t => t === secondaryTime);

    if (step < 0) {
        while (secondaryTimeSteps[step] < secondaryTime) {
            ++step;
        }
    }

    return step;
};
