/**
 * Time data used to calculate time to be displayed on chrono.
 *
 * Depending whether time is running or paused:
 * - number: paused chrono
 * - date: running chrono, date when chrono reaches 0:00.
 *
 * Depending whether time is countdown or incrementing:
 * - positive number/future date: countdown timer.
 * - negative number/past date: time is incrementing.
 */
type TimeValue = Date | number;

export default TimeValue;

export const timeValueToSeconds = (timeValue: TimeValue): number => {
    return timeValue instanceof Date
        ? (timeValue.getTime() - new Date().getTime()) / 1000
        : timeValue
    ;
};
