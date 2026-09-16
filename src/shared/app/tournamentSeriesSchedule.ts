import { TournamentSeriesSchedule } from './models/TournamentSeriesSchedule.js';
import { nextSeriesTitle } from './tournamentSeriesUtils.js';

const MINUTES_PER_DAY = 24 * 60;

/**
 * How many days to look ahead when searching weekly occurrences.
 * More than a year: enough to always find occurrences of any weekly schedule.
 */
const WEEKLY_SEARCH_DAYS = 400;

/**
 * How many months to look ahead when searching monthly occurrences.
 * Enough to find 5 occurrences even when most months are skipped, e.g "the 31th".
 */
const MONTHLY_SEARCH_MONTHS = 60;

/**
 * Date of the nth weekday of a month, e.g "the 3rd saturday of march 2026".
 * nth: 1 to 4, or -1 for the last one of the month.
 *
 * Returns null when this month has no such day, e.g there is no 5th saturday.
 */
const nthWeekdayOfMonth = (year: number, month: number, nth: number, weekday: number): null | number => {
    if (nth === -1) {
        // Day 0 of next month is the last day of this month
        const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        const lastWeekday = new Date(Date.UTC(year, month, lastDay)).getUTCDay();

        return lastDay - ((lastWeekday - weekday + 7) % 7);
    }

    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
    const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    return day > lastDay ? null : day;
};

/**
 * Occurrence of a monthly schedule in a given month, or null if this month has none,
 * e.g "the 31th" in february, or "the 5th monday" in a month having only 4 mondays.
 */
const monthlyOccurrence = (schedule: TournamentSeriesSchedule, year: number, month: number): null | Date => {
    const day = schedule.monthlyMode === 'nthWeekday'
        ? nthWeekdayOfMonth(year, month, schedule.nth, schedule.weekday)
        : schedule.dayOfMonth
    ;

    if (day === null) {
        return null;
    }

    const date = new Date(Date.UTC(year, month, day, schedule.hour, schedule.minute));

    // Month overflowed, e.g the 31th of february became the 2nd or 3rd of march
    if (date.getUTCMonth() !== ((month % 12) + 12) % 12) {
        return null;
    }

    return date;
};

/**
 * Next dates a tournament of this series should start at,
 * strictly after "from", soonest first.
 *
 * Schedule is expressed in UTC.
 */
export const nextOccurrences = (schedule: TournamentSeriesSchedule, from: Date, count: number): Date[] => {
    const occurrences: Date[] = [];

    if (schedule.frequency === 'weekly') {
        if (schedule.weekdays.length === 0) {
            return [];
        }

        const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));

        for (let i = 0; i < WEEKLY_SEARCH_DAYS && occurrences.length < count; ++i) {
            const date = new Date(Date.UTC(
                day.getUTCFullYear(),
                day.getUTCMonth(),
                day.getUTCDate() + i,
                schedule.hour,
                schedule.minute,
            ));

            if (schedule.weekdays.includes(date.getUTCDay()) && date > from) {
                occurrences.push(date);
            }
        }

        return occurrences;
    }

    const year = from.getUTCFullYear();
    const month = from.getUTCMonth();

    for (let i = 0; i < MONTHLY_SEARCH_MONTHS && occurrences.length < count; ++i) {
        const date = monthlyOccurrence(schedule, year, month + i);

        if (date !== null && date > from) {
            occurrences.push(date);
        }
    }

    return occurrences;
};

/**
 * Whether shifting this time by "offsetMinutes" makes it change day,
 * i.e the day of week or day of month of the schedule is not the same
 * in the organizer timezone and in UTC.
 */
export const crossesDayBoundary = (schedule: TournamentSeriesSchedule, offsetMinutes: number): boolean => {
    const minutes = schedule.hour * 60 + schedule.minute + offsetMinutes;

    return minutes < 0 || minutes >= MINUTES_PER_DAY;
};

/**
 * Shift a schedule by a number of minutes.
 * Weekdays of a weekly schedule are shifted too when time crosses midnight,
 * e.g "tuesday 00:30" shifted by -120 minutes becomes "monday 22:30".
 *
 * Day of month and nth weekday of a monthly schedule cannot be shifted
 * in a meaningful way (the 1st of a month would become "the last day of previous month"),
 * so they are left untouched: they always refer to the UTC day.
 * Form warns organizer about it, see crossesDayBoundary().
 */
const shiftSchedule = (schedule: TournamentSeriesSchedule, offsetMinutes: number): TournamentSeriesSchedule => {
    const minutes = schedule.hour * 60 + schedule.minute + offsetMinutes;
    const dayShift = Math.floor(minutes / MINUTES_PER_DAY);
    const dayMinutes = minutes - dayShift * MINUTES_PER_DAY;

    const shifted = new TournamentSeriesSchedule();

    shifted.frequency = schedule.frequency;
    shifted.weekdays = schedule.weekdays.map(weekday => (((weekday + dayShift) % 7) + 7) % 7);
    shifted.monthlyMode = schedule.monthlyMode;
    shifted.dayOfMonth = schedule.dayOfMonth;
    shifted.nth = schedule.nth;
    shifted.weekday = schedule.weekday;
    shifted.hour = Math.floor(dayMinutes / 60);
    shifted.minute = dayMinutes % 60;

    return shifted;
};

/**
 * Offset in minutes to add to a local time to get the UTC time,
 * e.g 20:00 in Europe/Paris in summer (UTC+2) gives 120 minutes to subtract, so -120.
 */
const currentTimezoneOffsetMinutes = (): number => new Date().getTimezoneOffset();

/**
 * Converts a schedule filled by organizer in his own timezone
 * to the UTC schedule to persist.
 */
export const localScheduleToUtc = (schedule: TournamentSeriesSchedule): TournamentSeriesSchedule =>
    shiftSchedule(schedule, currentTimezoneOffsetMinutes())
;

/**
 * Converts a persisted UTC schedule back to organizer timezone, to display it in the form.
 */
export const utcScheduleToLocal = (schedule: TournamentSeriesSchedule): TournamentSeriesSchedule =>
    shiftSchedule(schedule, -currentTimezoneOffsetMinutes())
;

/**
 * Whether the schedule, once converted to UTC, changes day.
 */
export const localScheduleCrossesDayBoundary = (schedule: TournamentSeriesSchedule): boolean =>
    crossesDayBoundary(schedule, currentTimezoneOffsetMinutes())
;

export type SeriesInstancePreview = {
    /**
     * Title the tournament will have, resolved from series title pattern.
     */
    title: string;

    /**
     * When the tournament starts.
     */
    startsAt: Date;

    /**
     * When the tournament will be automatically created.
     */
    createdAt: Date;
};

/**
 * Next instances that will be automatically created in a series.
 * Used both to simulate the schedule in the form, and to create them server side.
 */
export const nextSeriesInstances = (
    series: { title: string, titlePattern: null | string },
    schedule: TournamentSeriesSchedule,
    autoCreateOffsetSeconds: number,
    nextTournamentNumber: number,
    from: Date,
    count: number,
): SeriesInstancePreview[] => {
    return nextOccurrences(schedule, from, count).map((startsAt, index) => ({
        title: nextSeriesTitle(series, nextTournamentNumber + index, startsAt),
        startsAt,
        createdAt: new Date(startsAt.getTime() - autoCreateOffsetSeconds * 1000),
    }));
};
