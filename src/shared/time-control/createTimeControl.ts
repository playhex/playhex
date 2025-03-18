import { AbstractTimeControl, GameTimeData } from './TimeControl.js';
import TimeControlType from './TimeControlType.js';
import { ByoYomiTimeControl } from './time-controls/ByoYomiTimeControl.js';
import { FischerTimeControl } from './time-controls/FischerTimeControl.js';

export type CreateTimeControlOptions = {
    /**
     * "System" max time is a clock can reach (in ms).
     * It will override clock options if needed,
     * e.g Fischer maxTime will default to systemMaxTime and cannot be greater.
     *
     * If maxTime is not provided, systemMaxTime is used.
     * Error is thrown if maxTime > systemMaxTime.
     *
     * A recommended value can be e.g 21 days,
     * to prevent reaching 24.8 days limit from 32-bit signed integer,
     * if you need to store it as well, or use it in a setTimeout().
     */
    systemMaxTime?: number;
};

export const defaultCreateOptions: CreateTimeControlOptions = {};

/**
 * Recreate a time control instance from options and values data.
 *
 * If only options is passed, create a fresh new time control from options.
 * If values are also passed, time control state will be restored to these values.
 *
 * Can make time control emit "elapsed" event if providing values with an elapsed time value.
 */
export const createTimeControl = (
    timeControlType: TimeControlType,
    timeControlValues: null | GameTimeData = null,
    createOptions: CreateTimeControlOptions = defaultCreateOptions,
): AbstractTimeControl => {

    const { type, options } = timeControlType;
    let timeControl: AbstractTimeControl;

    switch (type) {
        case 'fischer':
            if (undefined !== options.maxTime
                && undefined !== defaultCreateOptions.systemMaxTime
                && options.maxTime > defaultCreateOptions.systemMaxTime
            ) {
                throw new Error('FischerTimeControl invalid options: cannot set maxTime > systemMaxTime');
            }

            options.maxTime ??= createOptions.systemMaxTime;
            timeControl = new FischerTimeControl(options);
            break;

        case 'byoyomi':
            timeControl = new ByoYomiTimeControl(options);
            break;
    }

    if (null !== timeControlValues) {
        timeControl.setValues(timeControlValues, new Date());
    }

    return timeControl;
};
