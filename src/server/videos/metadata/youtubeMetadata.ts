import { youtubeVideoUrl } from '../../../shared/app/videos/youtube.js';
import { parseIsoDuration } from '../../../shared/app/videos/duration.js';
import { toVideoPublishedAt, type VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';
import logger from '../../services/logger.js';

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
            publishedAt?: string;
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

    return {
        url: youtubeVideoUrl(videoId),
        title: snippet.title,
        authorName: snippet.channelTitle,
        durationSeconds: parseIsoDuration(contentDetails.duration),
        publishedAt: toVideoPublishedAt(snippet.publishedAt),
        thumbnailUrl: (thumbnails.maxres ?? thumbnails.standard ?? thumbnails.high ?? thumbnails.medium ?? thumbnails.default)?.url ?? null,
        keywords: toKeywords(snippet.tags?.length ? snippet.tags : snippet.description),
    };
};

/**
 * Internal api used by Youtube web player, only fields we need.
 */
export type YoutubePlayerResponse = {
    videoDetails?: {
        lengthSeconds?: string;
        keywords?: string[];
        shortDescription?: string;
    };
    microformat?: {
        playerMicroformatRenderer?: {
            publishDate?: string;
            uploadDate?: string;
        };
    };
};

type YoutubePlayerMetadata = Pick<VideoMetadata, 'durationSeconds' | 'publishedAt' | 'keywords'>;

export const parseYoutubePlayerResponse = ({ videoDetails, microformat }: YoutubePlayerResponse): null | YoutubePlayerMetadata => {
    if (!videoDetails) {
        return null;
    }

    const durationSeconds = Number(videoDetails.lengthSeconds);
    const microformatRenderer = microformat?.playerMicroformatRenderer;

    return {
        durationSeconds: Number.isInteger(durationSeconds) && durationSeconds > 0 ? durationSeconds : null,
        publishedAt: toVideoPublishedAt(microformatRenderer?.publishDate ?? microformatRenderer?.uploadDate),
        keywords: toKeywords(videoDetails.keywords?.length ? videoDetails.keywords : videoDetails.shortDescription),
    };
};

/**
 * Same request as Youtube web player, much lighter than crawling video page (~10KB vs 1.3MB).
 * Best effort: this api is not documented and may change.
 */
const fetchFromPlayerApi = async (videoId: string): Promise<null | YoutubePlayerMetadata> => {
    try {
        const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                videoId,
                context: { client: { clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en' } },
            }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });

        if (!response.ok) {
            throw new Error(`Youtube player api responded with status ${response.status}`);
        }

        return parseYoutubePlayerResponse(await response.json() as YoutubePlayerResponse);
    } catch (reason) {
        logger.notice('Could not get youtube video infos from player api', { videoId, reason });

        return null;
    }
};

/**
 * Without api key: title, author and thumbnail from oEmbed,
 * duration, publication date and keywords from player api.
 */
const fetchFromOEmbed = async (videoId: string): Promise<VideoMetadata> => {
    const url = new URL('https://www.youtube.com/oembed');

    url.searchParams.set('url', youtubeVideoUrl(videoId));
    url.searchParams.set('format', 'json');

    const [response, playerMetadata] = await Promise.all([
        fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) }),
        fetchFromPlayerApi(videoId),
    ]);

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
        durationSeconds: playerMetadata?.durationSeconds ?? null,
        publishedAt: playerMetadata?.publishedAt ?? null,
        thumbnailUrl: oEmbed.thumbnail_url,
        keywords: playerMetadata?.keywords ?? '',
    };
};

/**
 * Uses Youtube Data API if YOUTUBE_API_KEY is set,
 * else fallback to oEmbed and player api.
 *
 * @throws {VideoNotFoundError}
 */
export const fetchYoutubeMetadata = async (videoId: string): Promise<VideoMetadata> => YOUTUBE_API_KEY
    ? await fetchFromApi(videoId, YOUTUBE_API_KEY)
    : await fetchFromOEmbed(videoId)
;
