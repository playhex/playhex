/**
 * Parses an ISO 8601 duration as returned by Youtube API, e.g "PT1H2M3S".
 *
 * @returns Duration in seconds, or null if invalid
 */
export const parseIsoDuration = (duration: string): null | number => {
    const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);

    if (match === null || duration === 'P' || duration.endsWith('T')) {
        return null;
    }

    const [, days, hours, minutes, seconds] = match.map(value => Number(value ?? 0));

    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
};

/**
 * 125 => "2:05"
 * 3725 => "1:02:05"
 */
export const formatVideoDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');

    return hours > 0
        ? `${hours}:${pad(minutes)}:${pad(seconds)}`
        : `${minutes}:${pad(seconds)}`;
};

/**
 * Parses duration typed by user: "h:mm:ss", "m:ss", or "s".
 *
 * @returns Duration in seconds, or null if invalid
 */
export const parseVideoDuration = (input: string): null | number => {
    const parts = input.trim().split(':');

    if (parts.length > 3 || parts.some(part => !/^\d+$/.test(part))) {
        return null;
    }

    const numbers = parts.map(Number);

    // minutes and seconds must be < 60, except first part
    if (numbers.slice(1).some(n => n >= 60)) {
        return null;
    }

    return numbers.reduce((total, n) => total * 60 + n, 0);
};
