import TimeControlType from '../time-control/TimeControlType';
import { GameOptionsData } from './GameOptions';

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
            return options.secondsPerMove;

        case 'absolute':
            return options.secondsPerPlayer / averageMoves;

        case 'fischer':
            return options.initialSeconds / averageMoves
                + (options.incrementSeconds ?? 0);

        case 'byoyomi':
            console.log(
                options.initialSeconds / averageMoves
                , (Math.max(options.periodsCount - 1, 0)) * options.periodSeconds / averageMoves
                , (options.periodsCount > 0 ? options.periodSeconds : 0)
            );
            return options.initialSeconds / averageMoves
                + (options.periodsCount > 0
                    ? (options.periodsCount - 1) * options.periodSeconds / averageMoves + options.periodSeconds
                    : 0
                )
            ;
    }
};


type TimeControlCadencyName = 'blitz' | 'normal' | 'correspondance';

/**
 * Naive function that guess if a game is a blitz or correspondance
 * given its time control and board size.
 */
export const timeControlToCadencyName = (gameOptions: GameOptionsData): TimeControlCadencyName => {
    const averageSecondsPerMove = calcAverageSecondsPerMove(
        gameOptions.timeControl,
        gameOptions.boardsize,
    );

    if (averageSecondsPerMove < 10) {
        return 'blitz';
    }

    // wet finger technique
    if (averageSecondsPerMove > 3600 * 9) {
        return 'correspondance';
    }

    return 'normal';
};

/**
 * Show seconds like time. For in game elapsing time.
 * "5:02", "1h06", "1d 5h"
 */
export const secondsToTime = (seconds: number): string => {
    const { floor } = Math;

    const parts = [];

    parts.push(floor(seconds / 86400));
    seconds -= parts[0] * 86400;
    parts.push(floor(seconds / 3600));
    seconds -= parts[1] * 3600;
    parts.push(floor(seconds / 60));
    seconds -= parts[2] * 60;
    parts.push(floor(seconds));

    if (parts[0] > 0) {
        return parts[1] > 0
            ? `${parts[0]}d ${parts[1]}h`
            : `${parts[0]}d`
        ;
    }

    if (parts[1] > 0) {
        return parts[2] > 0
            ? `${parts[1]}h${String(parts[2]).padStart(2, '0')}`
            :`${parts[1]}h`
        ;
    }

    return `${parts[2]}:${String(parts[3]).padStart(2, '0')}`;
};

/**
 * Show seconds like duration. For lobby or time increments.
 * "5min", "1h", "1d12h"
 */
export const secondsToDuration = (seconds: number, precision = 2): string => {
    if (seconds <= 0) {
        return '0';
    }

    const { floor } = Math;

    const parts = [];

    parts.push(floor(seconds / 86400));
    seconds -= parts[0] * 86400;
    parts.push(floor(seconds / 3600));
    seconds -= parts[1] * 3600;
    parts.push(floor(seconds / 60));
    seconds -= parts[2] * 60;
    parts.push(floor(seconds));

    let tokens = [];

    if (parts[0] > 0) {
        tokens.push(parts[0] + 'd');
    }

    if (parts[1] > 0) {
        tokens.push(parts[1] + 'h');
    }

    if (parts[2] > 0) {
        tokens.push(parts[2] + 'min');
    }

    if (parts[3] > 0) {
        tokens.push(parts[3] + 's');
    }

    return tokens.slice(0, precision).join('');
};

export const timeControlToString = (timeControl: TimeControlType): string => {
    switch (timeControl.type) {
        case 'fischer': {
            let string = secondsToDuration(timeControl.options.initialSeconds);

            if (timeControl.options.incrementSeconds) {
                string += ' + ' + secondsToDuration(timeControl.options.incrementSeconds);
            }

            return string;
        }

        case 'byoyomi': {
            let string = secondsToDuration(timeControl.options.initialSeconds);

            if (timeControl.options.periodSeconds && timeControl.options.periodsCount) {
                string += ` + ${timeControl.options.periodsCount} × ${secondsToDuration(timeControl.options.periodSeconds)}`;
            }

            return string;
        }

        case 'absolute': {
            return secondsToDuration(timeControl.options.secondsPerPlayer) + ' / player';
        }

        case 'simple': {
            return secondsToDuration(timeControl.options.secondsPerMove) + ' / move';
        }
    }
};
