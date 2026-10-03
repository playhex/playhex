import type { VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { parseIsoDuration } from '../../../shared/app/videos/duration.js';
import { toVideoLanguage } from '../../../shared/app/videos/videoLanguages.js';
import { safeFetch, SafeFetchError } from '../safeFetch.js';
import { VideoMetadataUnavailableError, VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';

/**
 * Only <head> is needed, which is generally at the beginning of the page.
 */
const HTML_MAX_SIZE = 1024 * 1024;

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
};

export const decodeHtmlEntities = (text: string): string => text.replace(
    /&(#x[\da-f]+|#\d+|[a-z]+);/gi,
    (entity, code: string) => {
        if (code[0] === '#') {
            const codePoint = code[1].toLowerCase() === 'x'
                ? parseInt(code.substring(2), 16)
                : parseInt(code.substring(1), 10);

            return codePoint > 0 && codePoint <= 0x10FFFF ? String.fromCodePoint(codePoint) : entity;
        }

        return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
    },
);

/**
 * Meta tags content, by property, name or itemprop (lowercased).
 * Keeps first occurrence.
 */
export const parseMetaTags = (html: string): Map<string, string> => {
    const metas = new Map<string, string>();

    for (const [, attributesString] of html.matchAll(/<meta\s([^>]*)>/gi)) {
        const attributes: Record<string, string> = {};

        for (const [, name, , doubleQuoted, singleQuoted, unquoted] of attributesString.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
            attributes[name.toLowerCase()] = decodeHtmlEntities(doubleQuoted ?? singleQuoted ?? unquoted ?? '').trim();
        }

        const key = (attributes.property ?? attributes.name ?? attributes.itemprop)?.toLowerCase();

        if (key && attributes.content && !metas.has(key)) {
            metas.set(key, attributes.content);
        }
    }

    return metas;
};

const parseTitleTag = (html: string): null | string => {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);

    return match ? decodeHtmlEntities(match[1]).trim() : null;
};

/**
 * Duration in seconds ("video:duration"), or ISO 8601 (schema.org "duration")
 */
const parseDuration = (value: undefined | string): null | number => {
    if (!value) {
        return null;
    }

    if (/^\d+$/.test(value)) {
        return parseInt(value, 10);
    }

    return parseIsoDuration(value);
};

/**
 * Not an url, e.g "article:author" can be a profile link.
 */
const notUrl = (value: undefined | string): undefined | string => value && !/^https?:\/\//.test(value) ? value : undefined;

/**
 * Fallback for any page: reads OpenGraph, Twitter card, and schema.org meta tags.
 * Keywords from keywords meta tag, or description.
 *
 * @throws {VideoNotFoundError}
 * @throws {VideoMetadataUnavailableError}
 */
export const fetchHtmlMetadata = async (url: string): Promise<VideoMetadata> => {
    let response: Awaited<ReturnType<typeof safeFetch>>;

    try {
        response = await safeFetch(url, { maxSize: HTML_MAX_SIZE, truncate: true });
    } catch (e) {
        if (e instanceof SafeFetchError) {
            throw new VideoMetadataUnavailableError(e.message);
        }

        throw e;
    }

    if (response.status === 404 || response.status === 410) {
        throw new VideoNotFoundError();
    }

    if (response.status !== 200 || !response.mimeType.includes('html')) {
        throw new VideoMetadataUnavailableError(`Unexpected response: ${response.status} ${response.mimeType}`);
    }

    const html = response.body.toString('utf8');
    const metas = parseMetaTags(html);
    const meta = (...keys: string[]): undefined | string => keys.map(key => metas.get(key)).find(value => value);
    const language = toVideoLanguage(meta('og:locale')?.replace('_', '-'));

    return {
        url,
        title: meta('og:title', 'twitter:title', 'name') ?? parseTitleTag(html) ?? '',
        authorName: notUrl(meta('author', 'article:author', 'twitter:creator')) ?? '',
        durationSeconds: parseDuration(meta('video:duration', 'og:video:duration', 'duration')),
        languages: language === null ? [] : [language],
        thumbnailUrl: meta('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'thumbnailurl') ?? null,
        keywords: toKeywords(meta('keywords', 'news_keywords') ?? meta('og:description', 'description', 'twitter:description')),
    };
};
