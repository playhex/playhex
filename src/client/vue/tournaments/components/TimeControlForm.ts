import TimeControlType from '../../../../shared/time-control/TimeControlType.js';

/**
 * Layer between time control form input and TimeControlType.
 * Allows to convert time control form data (sliders) from and to TimeControlType
 */
export class TimeControlForm
{
    /**
     * Which cadency to use,
     * will switch set of values of sliders between shorter to longer times.
     */
    cadency: 'live' | 'correspondence' = 'live';

    /**
     * Which clock type to use
     */
    clockType: 'fischer' | 'byoyomi' = 'fischer';

    /**
     * First slider, initial time for Fischer and ByoYomi
     */
    initialTimeStep: number = 0;

    /**
     * Second slider, time increment for Fisher and period time for ByoYomi
     */
    secondaryTimeStep: number = 0;

    /**
     * Number of periods for ByoYomi
     */
    periods: number = 5;

    /**
     * Fischer: capped or not (maxTime = initialTime, or no limit)
     */
    capped: boolean = false;

    /**
     * @throws {TimeControlFormConversionError} When it is impossible to convert a TimeControlType to a TimeControlForm
     *                                          because there is no predefined step for given time, or maxTime is custom...
     */
    static fromTimeControlType(timeControlType: TimeControlType): TimeControlForm
    {
        const output = new TimeControlForm();

        if (timeControlType.options.initialTime >= timeSteps.correspondence.initial[0]) {
            output.cadency = 'correspondence';
        } else {
            output.cadency = 'live';
        }

        output.clockType = timeControlType.type;

        if ('fischer' === timeControlType.type) {
            const initialTimeStep = timeSteps[output.cadency].initial.findIndex(value => value === timeControlType.options.initialTime);
            const secondaryTimeStep = timeSteps[output.cadency].secondary.findIndex(value => value === timeControlType.options.timeIncrement);

            if (initialTimeStep < 0 || secondaryTimeStep < 0) {
                throw new TimeControlFormConversionError('No step for initial or secondary time');
            }

            output.initialTimeStep = initialTimeStep;
            output.secondaryTimeStep = secondaryTimeStep;

            if (undefined === timeControlType.options.maxTime) {
                output.capped = false;
            } else if (timeControlType.options.initialTime === timeControlType.options.maxTime) {
                output.capped = true;
            } else {
                throw new TimeControlFormConversionError('capped cannot be determined: maxTime is not undefined not equals to initialTime');
            }
        }

        if ('byoyomi' === timeControlType.type) {
            const initialTimeStep = timeSteps[output.cadency].initial.findIndex(value => value === timeControlType.options.initialTime);
            const secondaryTimeStep = timeSteps[output.cadency].secondary.findIndex(value => value === timeControlType.options.periodTime);

            if (initialTimeStep < 0 || secondaryTimeStep < 0) {
                throw new TimeControlFormConversionError('No step for initial or secondary time');
            }

            output.initialTimeStep = initialTimeStep;
            output.secondaryTimeStep = secondaryTimeStep;

            if (timeControlType.options.periodsCount < BYO_YOMI_PERIODS_MIN || timeControlType.options.periodsCount > BYO_YOMI_PERIODS_MAX) {
                throw new TimeControlFormConversionError('ByoYomi periods count not in range');
            }

            output.periods = timeControlType.options.periodsCount;
        }

        return output;
    }

    toTimeControlType(timeControlType: null | TimeControlType = null): TimeControlType
    {
        if (null === timeControlType) {
            timeControlType = {
                type: 'fischer',
                options: {
                    initialTime: 0,
                    timeIncrement: 0,
                    maxTime: 0,
                },
            };
        }

        timeControlType.type = this.clockType;

        if ('fischer' === timeControlType.type) {
            timeControlType.options.initialTime = timeSteps[this.cadency].initial[this.initialTimeStep];
            timeControlType.options.timeIncrement = timeSteps[this.cadency].secondary[this.secondaryTimeStep];
            timeControlType.options.maxTime = this.capped
                ? timeControlType.options.initialTime
                : undefined
            ;
        }

        if ('byoyomi' === timeControlType.type) {
            timeControlType.options.initialTime = timeSteps[this.cadency].initial[this.initialTimeStep];
            timeControlType.options.periodTime = timeSteps[this.cadency].secondary[this.secondaryTimeStep];
            timeControlType.options.periodsCount = this.periods;
        }

        return timeControlType;
    }
}

export class TimeControlFormConversionError extends Error {}

export type Steps = {
    /**
     * Initial time for Fischer and ByoYomi
     */
    initial: number[];

    /**
     * Time increment for Fischer and period time for ByoYomi
     */
    secondary: number[];
};

/**
 * Predefined values for sliders:
 * initial and secondary time steps
 */
export const timeSteps: {
    live: Steps;
    correspondence: Steps;
} = {
    live: {
        initial: [
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
        ],
        secondary: [
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
        ],
    },
    correspondence: {
        initial: [
            86400 * 1 * 1000,
            86400 * 3 * 1000,
            86400 * 7 * 1000,
            86400 * 14 * 1000,
        ],
        secondary: [
            3600 * 12 * 1000,
            86400 * 1 * 1000,
            86400 * 2 * 1000,
            86400 * 3 * 1000,
            86400 * 5 * 1000,
            86400 * 7 * 1000,
            86400 * 10 * 1000,
            86400 * 14 * 1000,
        ],
    },
};

export const BYO_YOMI_PERIODS_MIN = 1;
export const BYO_YOMI_PERIODS_MAX = 10;
