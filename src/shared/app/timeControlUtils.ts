import { t } from 'i18next';
import TimeControlType from '../time-control/TimeControlType.js';

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

    const { type, options } = timeControlType;

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
 * Required parameters to compute time control cadency.
 * Should be compatible with HostedGameOptions.
 */
export type TimeControlBoardsize = {
    timeControl: TimeControlType;
    boardsize: number;
};

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

export const timeControlToString = (timeControl: TimeControlType): string => {
    switch (timeControl.type) {
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
