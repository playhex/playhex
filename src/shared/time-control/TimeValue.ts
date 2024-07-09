/**
 * Time data used to calculate time to be displayed on chrono.
 *
 * Depending whether time is running or paused:
 * - number: paused chrono, number of remaining milliseconds
 * - date: running chrono, date when chrono reaches 0:00.
 *
 * Depending whether time is countdown or incrementing:
 * - positive number/future date: countdown timer.
 * - negative number/past date: time is incrementing.
 */
type TimeValue = Date | number;

export default TimeValue;

/**
 * Convert a elasping or not time value to milliseconds, from a given date.
 * date can be new Date(), or server date.
 */
export const timeValueToMilliseconds = (timeValue: TimeValue, date: Date): number => {
    if (timeValue instanceof Date) {
        return timeValue.getTime() - date.getTime();
    }

    return timeValue;
};
