import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsInt, Max, Min } from 'class-validator';

// This object uses @Expose from class-transformer instead of custom @Expose to always expose fields no matter if there is a serialization group.
import { Expose } from 'class-transformer';

export const scheduleFrequencies = [
    'weekly',
    'monthly',
] as const;

export type ScheduleFrequency = typeof scheduleFrequencies[number];

export const scheduleMonthlyModes = [
    /**
     * A given day number in the month, e.g "the 1st of every month".
     */
    'dayOfMonth',

    /**
     * A given weekday occurrence in the month, e.g "the 3rd saturday of every month".
     */
    'nthWeekday',
] as const;

export type ScheduleMonthlyMode = typeof scheduleMonthlyModes[number];

/**
 * When instances of a series start, e.g "every tuesday and thursday at 17:00",
 * or "the 3rd saturday of every month at 18:00".
 *
 * Everything is expressed in UTC: organizer inputs his local time in the form,
 * it is converted to UTC before being persisted, so a same instant is used
 * whatever the organizer timezone, and daylight saving time changes.
 *
 * Only the fields relevant to frequency/monthlyMode are used,
 * others keep a default value to make the form able to switch back and forth.
 */
export class TournamentSeriesSchedule
{
    @Expose()
    @IsIn(scheduleFrequencies, { always: true })
    frequency: ScheduleFrequency;

    /**
     * Used when frequency is "weekly".
     * UTC days of week the tournament starts, 0 = sunday, 6 = saturday.
     *
     * e.g [2, 4] for "every tuesday and thursday".
     */
    @Expose()
    @IsArray({ always: true })
    @ArrayNotEmpty({ always: true })
    @ArrayUnique({ always: true })
    @IsInt({ each: true, always: true })
    @Min(0, { each: true, always: true })
    @Max(6, { each: true, always: true })
    weekdays: number[];

    /**
     * Used when frequency is "monthly".
     */
    @Expose()
    @IsIn(scheduleMonthlyModes, { always: true })
    monthlyMode: ScheduleMonthlyMode;

    /**
     * Used when frequency is "monthly" and monthlyMode is "dayOfMonth".
     * Months which do not have this day are skipped, e.g 31 skips february.
     */
    @Expose()
    @IsInt({ always: true })
    @Min(1, { always: true })
    @Max(31, { always: true })
    dayOfMonth: number;

    /**
     * Used when frequency is "monthly" and monthlyMode is "nthWeekday".
     * 1 = first, 2 = second, ... and -1 = last one of the month.
     */
    @Expose()
    @IsInt({ always: true })
    @IsIn([1, 2, 3, 4, -1], { always: true })
    nth: number;

    /**
     * Used when frequency is "monthly" and monthlyMode is "nthWeekday".
     * UTC day of week, 0 = sunday, 6 = saturday.
     */
    @Expose()
    @IsInt({ always: true })
    @Min(0, { always: true })
    @Max(6, { always: true })
    weekday: number;

    /**
     * UTC hour and minute the tournament starts at.
     */
    @Expose()
    @IsInt({ always: true })
    @Min(0, { always: true })
    @Max(23, { always: true })
    hour: number;

    @Expose()
    @IsInt({ always: true })
    @Min(0, { always: true })
    @Max(59, { always: true })
    minute: number;
}

/**
 * Creates a schedule with default values, for the auto create form.
 * Defaults to "every monday at 18:00 UTC".
 */
export const createTournamentSeriesScheduleDefaults = (): TournamentSeriesSchedule => {
    const schedule = new TournamentSeriesSchedule();

    schedule.frequency = 'weekly';
    schedule.weekdays = [1];
    schedule.monthlyMode = 'dayOfMonth';
    schedule.dayOfMonth = 1;
    schedule.nth = 1;
    schedule.weekday = 6;
    schedule.hour = 18;
    schedule.minute = 0;

    return schedule;
};
