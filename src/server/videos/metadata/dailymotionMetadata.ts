import { toVideoPublishedAt, type VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';

const FETCH_TIMEOUT = 10000;

type DailymotionVideoResponse = {
    'title': string;
    'owner.screenname': string;
    'duration': number;
    'thumbnail_720_url'?: string;
    'tags'?: string[];
    'description'?: string;
    'created_time'?: number;
};

/**
 * Handles dailymotion.com/video/x8j7qvf and dai.ly/x8j7qvf
 */
export const parseDailymotionVideoId = (url: string): null | string => {
    let parsed: URL;

    try {
        parsed = new URL(url);
    } catch {
        return null;
    }

    const host = parsed.hostname.replace(/^www\./, '');
    let videoId: undefined | string;

    if (host === 'dailymotion.com') {
        videoId = parsed.pathname.match(/^\/video\/([a-z0-9]+)/i)?.[1];
    } else if (host === 'dai.ly') {
        videoId = parsed.pathname.split('/')[1];
    }

    return videoId && /^[a-z0-9]+$/i.test(videoId) ? videoId : null;
};

/**
 * Dailymotion public api, no key needed. Keywords from tags, or description.
 *
 * @throws {VideoNotFoundError}
 */
export const fetchDailymotionMetadata = async (videoId: string): Promise<VideoMetadata> => {
    const url = new URL(`https://api.dailymotion.com/video/${videoId}`);

    url.searchParams.set('fields', 'title,owner.screenname,duration,thumbnail_720_url,tags,description,created_time');

    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });

    if (response.status === 404 || response.status === 403 || response.status === 400) {
        throw new VideoNotFoundError();
    }

    if (!response.ok) {
        throw new Error(`Dailymotion API responded with status ${response.status}`);
    }

    const video = await response.json() as DailymotionVideoResponse;

    return {
        url: `https://www.dailymotion.com/video/${videoId}`,
        title: video.title,
        authorName: video['owner.screenname'],
        durationSeconds: video.duration,
        publishedAt: toVideoPublishedAt(video.created_time),
        thumbnailUrl: video.thumbnail_720_url ?? null,
        keywords: toKeywords(video.tags?.length ? video.tags : video.description),
    };
};
