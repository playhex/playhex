import { t } from 'i18next';
import TimeControlType from '../time-control/TimeControlType';
import HostedGameOptions from './models/HostedGameOptions';

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
        case 'simple':
            return options.timePerMove / 1000;

        case 'absolute':
            return (options.timePerPlayer / 1000) / averageMoves;

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
export const timeControlToCadencyName = (gameOptions: HostedGameOptions): TimeControlCadencyName => {
    const averageSecondsPerMove = calcAverageSecondsPerMove(
        gameOptions.timeControl,
        gameOptions.boardsize,
    );

    if (averageSecondsPerMove < 10) {
        return 'blitz';
    }

    // wet finger technique
    if (averageSecondsPerMove > 3600 * 9) {
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

export const timeControlToString = (timeControl: TimeControlType): string => {
    switch (timeControl.type) {
        case 'fischer': {
            let string = msToDuration(timeControl.options.initialTime);

            if (timeControl.options.timeIncrement) {
                string += ' + ' + msToDuration(timeControl.options.timeIncrement);
            }

            return string;
        }

        case 'byoyomi': {
            let string = msToDuration(timeControl.options.initialTime);

            if (timeControl.options.periodTime && timeControl.options.periodsCount) {
                string += ` + ${timeControl.options.periodsCount} × ${msToDuration(timeControl.options.periodTime)}`;
            }

            return string;
        }

        case 'absolute': {
            return msToDuration(timeControl.options.timePerPlayer) + ' / ' + t('_player');
        }

        case 'simple': {
            return msToDuration(timeControl.options.timePerMove) + ' / ' + t('move');
        }
    }
};
