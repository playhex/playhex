export const VIDEO_URL_MAX_LENGTH = 512;
export const VIDEO_TITLE_MAX_LENGTH = 255;
export const VIDEO_AUTHOR_NAME_MAX_LENGTH = 128;
export const VIDEO_KEYWORDS_MAX_LENGTH = 512;

/**
 * Prefilled values from a video link (youtube, vimeo, or any page).
 * Null or empty when not available.
 */
export type VideoMetadata = {
    url: string;
    title: string;
    authorName: string;
    durationSeconds: null | number;

    /**
     * Publication date on video platform, "YYYY-MM-DD".
     */
    publishedAt: null | string;

    thumbnailUrl: null | string;

    /**
     * Tags, keywords, or description, depending on source.
     */
    keywords: string;
};

/**
 * Fields sent when submitting a video,
 * along with a thumbnail file or a thumbnail url.
 */
export type VideoInput = {
    url: string;
    title: string;
    authorName: string;
    durationSeconds: number;

    /**
     * Publication date on video platform, "YYYY-MM-DD", or null if unknown.
     */
    publishedAt: null | string;

    /**
     * Optional, empty string if none.
     */
    keywords: string;
};

/**
 * Whether "YYYY-MM-DD" is a real day.
 * Needed because Date overflows instead of failing, e.g "2021-02-30" => March 2.
 */
const isExistingDay = (day: string): boolean => {
    const date = new Date(day);

    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(day);
};

/**
 * Converts a date from a video source (iso string, timestamp, "2013-01-14 15:12:39"...)
 * to "YYYY-MM-DD", or null if invalid.
 * Dates with a timezone are converted to UTC, so all sources are consistent,
 * dates without timezone are kept as written.
 */
export const toVideoPublishedAt = (date: null | undefined | string | number | Date): null | string => {
    if (date === null || date === undefined || date === '') {
        return null;
    }

    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date) && !/(Z|[+-]\d{2}:?\d{2})$/.test(date)) {
        const day = date.substring(0, 10);

        return isExistingDay(day) ? day : null;
    }

    const parsed = typeof date === 'number'
        ? new Date(date * 1000) // unix timestamp in seconds
        : new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed.toISOString().substring(0, 10);
};

/**
 * Latest allowed publication date, "YYYY-MM-DD": tomorrow in UTC,
 * so that today is allowed in every timezone.
 */
export const maxVideoPublishedAt = (): string => new Date(Date.now() + 86400 * 1000).toISOString().substring(0, 10);

/**
 * Must be an existing day "YYYY-MM-DD", and not in the future.
 */
export const isValidVideoPublishedAt = (publishedAt: string): boolean =>
    /^\d{4}-\d{2}-\d{2}$/.test(publishedAt)
    && isExistingDay(publishedAt)
    && publishedAt >= '1970-01-01'
    && publishedAt <= maxVideoPublishedAt()
;

export const isHttpUrl = (url: string): boolean => {
    try {
        const { protocol } = new URL(url);

        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * @returns List of errors, empty if input is valid
 */
export const validateVideoInput = (input: VideoInput): string[] => {
    const errors: string[] = [];

    if (!isHttpUrl(input.url) || input.url.length > VIDEO_URL_MAX_LENGTH) {
        errors.push('invalid url');
    }

    if (input.title.trim().length === 0 || input.title.length > VIDEO_TITLE_MAX_LENGTH) {
        errors.push('invalid title');
    }

    if (input.authorName.trim().length === 0 || input.authorName.length > VIDEO_AUTHOR_NAME_MAX_LENGTH) {
        errors.push('invalid author name');
    }

    if (input.keywords.length > VIDEO_KEYWORDS_MAX_LENGTH) {
        errors.push('keywords too long');
    }

    if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1) {
        errors.push('invalid duration');
    }

    if (input.publishedAt !== null && !isValidVideoPublishedAt(input.publishedAt)) {
        errors.push('invalid publication date');
    }

    return errors;
};
