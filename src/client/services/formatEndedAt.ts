import { format, isToday } from 'date-fns';

/**
 * Date a game ended, in games lists: only time if today, else only date.
 */
export const formatEndedAt = (date: Date): string => isToday(date)
    ? format(date, 'p')
    : format(date, 'd MMMM yyyy')
;
