import { _adapters } from 'chart.js';
import {
    parse, parseISO, toDate, isValid, format,
    startOfSecond, startOfMinute, startOfHour, startOfDay,
    startOfWeek, startOfMonth, startOfQuarter, startOfYear,
    addMilliseconds, addSeconds, addMinutes, addHours,
    addDays, addWeeks, addMonths, addQuarters, addYears,
    differenceInMilliseconds, differenceInSeconds, differenceInMinutes,
    differenceInHours, differenceInDays, differenceInWeeks,
    differenceInMonths, differenceInQuarters, differenceInYears,
    endOfSecond, endOfMinute, endOfHour, endOfDay,
    endOfWeek, endOfMonth, endOfQuarter, endOfYear,
    Day,
} from 'date-fns';

/**
 * Copy of https://github.com/chartjs/chartjs-adapter-date-fns/blob/master/src/index.js
 *
 * because install and importing it does not work (probably bug with esm/cjs)
 */

const FORMATS = {
    datetime: 'MMM d, yyyy, h:mm:ss aaaa',
    millisecond: 'h:mm:ss.SSS aaaa',
    second: 'h:mm:ss aaaa',
    minute: 'h:mm aaaa',
    hour: 'ha',
    day: 'MMM d',
    week: 'PP',
    month: 'MMM yyyy',
    quarter: 'qqq - yyyy',
    year: 'yyyy',
};

_adapters._date.override({
    formats: function () {
        return FORMATS;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parse: function (value: any, fmt) {
        if (value === null || typeof value === 'undefined') {
            return null;
        }
        const type = typeof value;
        if (type === 'number' || value instanceof Date) {
            value = toDate(value);
        } else if (type === 'string') {
            if (typeof fmt === 'string') {
                value = parse(value, fmt, new Date(), this.options);
            } else {
                value = parseISO(value, this.options);
            }
        }
        return isValid(value) ? value.getTime() : null;
    },

    format: function (time, fmt) {
        return format(time, fmt, this.options);
    },

    add: function (time, amount, unit) {
        switch (unit) {
            case 'millisecond': return addMilliseconds(time, amount).getTime();
            case 'second': return addSeconds(time, amount).getTime();
            case 'minute': return addMinutes(time, amount).getTime();
            case 'hour': return addHours(time, amount).getTime();
            case 'day': return addDays(time, amount).getTime();
            case 'week': return addWeeks(time, amount).getTime();
            case 'month': return addMonths(time, amount).getTime();
            case 'quarter': return addQuarters(time, amount).getTime();
            case 'year': return addYears(time, amount).getTime();
            default: return time;
        }
    },

    diff: function (max, min, unit) {
        switch (unit) {
            case 'millisecond': return differenceInMilliseconds(max, min);
            case 'second': return differenceInSeconds(max, min);
            case 'minute': return differenceInMinutes(max, min);
            case 'hour': return differenceInHours(max, min);
            case 'day': return differenceInDays(max, min);
            case 'week': return differenceInWeeks(max, min);
            case 'month': return differenceInMonths(max, min);
            case 'quarter': return differenceInQuarters(max, min);
            case 'year': return differenceInYears(max, min);
            default: return 0;
        }
    },

    startOf: function (time, unit, weekday) {
        switch (unit) {
            case 'second': return startOfSecond(time).getTime();
            case 'minute': return startOfMinute(time).getTime();
            case 'hour': return startOfHour(time).getTime();
            case 'day': return startOfDay(time).getTime();
            case 'week': return startOfWeek(time).getTime();
            case 'isoWeek': return startOfWeek(time, { weekStartsOn: +(weekday ?? 0) as Day }).getTime();
            case 'month': return startOfMonth(time).getTime();
            case 'quarter': return startOfQuarter(time).getTime();
            case 'year': return startOfYear(time).getTime();
            default: return time;
        }
    },

    endOf: function (time, unit) {
        switch (unit) {
            case 'second': return endOfSecond(time).getTime();
            case 'minute': return endOfMinute(time).getTime();
            case 'hour': return endOfHour(time).getTime();
            case 'day': return endOfDay(time).getTime();
            case 'week': return endOfWeek(time).getTime();
            case 'month': return endOfMonth(time).getTime();
            case 'quarter': return endOfQuarter(time).getTime();
            case 'year': return endOfYear(time).getTime();
            default: return time;
        }
    },
});
