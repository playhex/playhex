import { isVideoLanguage } from './videoLanguages.js';

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
    languages: string[];
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
    languages: string[];

    /**
     * Optional, empty string if none.
     */
    keywords: string;
};

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

    if (input.languages.length === 0 || input.languages.some(language => !isVideoLanguage(language))) {
        errors.push('invalid languages');
    }

    return errors;
};
