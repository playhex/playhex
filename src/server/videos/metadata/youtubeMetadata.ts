import { youtubeVideoUrl } from '../../../shared/app/videos/youtube.js';
import { parseIsoDuration } from '../../../shared/app/videos/duration.js';
import { toVideoLanguage } from '../../../shared/app/videos/videoLanguages.js';
import type { VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';

const FETCH_TIMEOUT = 10000;

const { YOUTUBE_API_KEY } = process.env;

type YoutubeThumbnail = { url: string };

type YoutubeApiVideosResponse = {
    items?: {
        snippet: {
            title: string;
            description: string;
            channelTitle: string;
            tags?: string[];
            defaultLanguage?: string;
            defaultAudioLanguage?: string;
            thumbnails: Partial<Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', YoutubeThumbnail>>;
        };
        contentDetails: {
            duration: string;
        };
    }[];
};

type YoutubeOEmbedResponse = {
    title: string;
    author_name: string;
    thumbnail_url: string;
};

/**
 * With Youtube Data API: all fields. Keywords from video tags, or description.
 */
const fetchFromApi = async (videoId: string, apiKey: string): Promise<VideoMetadata> => {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');

    url.searchParams.set('part', 'snippet,contentDetails');
    url.searchParams.set('id', videoId);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });

    if (!response.ok) {
        throw new Error(`Youtube API responded with status ${response.status}`);
    }

    const { items } = await response.json() as YoutubeApiVideosResponse;
    const item = items?.[0];

    if (!item) {
        throw new VideoNotFoundError();
    }

    const { snippet, contentDetails } = item;
    const { thumbnails } = snippet;
    const language = toVideoLanguage(snippet.defaultAudioLanguage ?? snippet.defaultLanguage);

    return {
        url: youtubeVideoUrl(videoId),
        title: snippet.title,
        authorName: snippet.channelTitle,
        durationSeconds: parseIsoDuration(contentDetails.duration),
        languages: language === null ? [] : [language],
        thumbnailUrl: (thumbnails.maxres ?? thumbnails.standard ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default)?.url ?? null,
        keywords: toKeywords(snippet.tags?.length ? snippet.tags : snippet.description),
    };
};

/**
 * Without api key: no duration, language, nor keywords.
 */
const fetchFromOEmbed = async (videoId: string): Promise<VideoMetadata> => {
    const url = new URL('https://www.youtube.com/oembed');

    url.searchParams.set('url', youtubeVideoUrl(videoId));
    url.searchParams.set('format', 'json');

    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });

    if (response.status === 404 || response.status === 400 || response.status === 401) {
        throw new VideoNotFoundError();
    }

    if (!response.ok) {
        throw new Error(`Youtube oEmbed responded with status ${response.status}`);
    }

    const oEmbed = await response.json() as YoutubeOEmbedResponse;

    return {
        url: youtubeVideoUrl(videoId),
        title: oEmbed.title,
        authorName: oEmbed.author_name,
        durationSeconds: null,
        languages: [],
        thumbnailUrl: oEmbed.thumbnail_url,
        keywords: '',
    };
};

/**
 * Uses Youtube Data API if YOUTUBE_API_KEY is set,
 * else fallback to oEmbed, which does not provide duration, language nor keywords.
 *
 * @throws {VideoNotFoundError}
 */
export const fetchYoutubeMetadata = async (videoId: string): Promise<VideoMetadata> => YOUTUBE_API_KEY
    ? await fetchFromApi(videoId, YOUTUBE_API_KEY)
    : await fetchFromOEmbed(videoId)
;
