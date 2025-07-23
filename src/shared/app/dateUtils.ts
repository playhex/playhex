import { Duration, formatDuration, intervalToDuration } from 'date-fns';

/**
 * Output a translated human-readble text for a duration between start and end date.
 * Example: "3 hours 2 minutes", or "2 days 23 minutes"
 *
 * @param precision Number of most relevant units. By default 2. Can be changed to display more or less units.
 */
export const formatDurationPrecision = (start: Date, end: Date, precision = 2) => {
    const duration = intervalToDuration({ start, end });
    const highestUnits: (keyof Duration)[] = Object.keys(duration).slice(0, precision) as (keyof Duration)[];
    const durationShorter: Duration = {};

    for (const unit of highestUnits) {
        durationShorter[unit] = duration[unit];
    }

    return formatDuration(durationShorter);
};
