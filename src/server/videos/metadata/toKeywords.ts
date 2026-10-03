import { VIDEO_KEYWORDS_MAX_LENGTH } from '../../../shared/app/videos/videoInput.js';

/**
 * Makes keywords field from tags list or description:
 * removes html tags, links and line breaks, truncates to max length on a word boundary.
 */
export const toKeywords = (text: null | undefined | string | string[]): string => {
    if (!text) {
        return '';
    }

    const joined = Array.isArray(text) ? text.join(', ') : text;
    const cleaned = joined
        .replace(/<[^>]*>/g, ' ')
        .replace(/https?:\/\/\S+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    ;

    if (cleaned.length <= VIDEO_KEYWORDS_MAX_LENGTH) {
        return cleaned;
    }

    const truncated = cleaned.substring(0, VIDEO_KEYWORDS_MAX_LENGTH + 1);
    const lastSpace = truncated.lastIndexOf(' ');

    return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated.substring(0, VIDEO_KEYWORDS_MAX_LENGTH))
        .replace(/[\s,;.-]+$/, '');
};
