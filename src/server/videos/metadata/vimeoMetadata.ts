import type { VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';

const FETCH_TIMEOUT = 10000;

type VimeoOEmbedResponse = {
    title: string;
    author_name: string;
    description?: string;
    duration?: number;
    thumbnail_url?: string;
};

export const isVimeoUrl = (url: string): boolean => {
    try {
        const { hostname } = new URL(url);

        return hostname === 'vimeo.com' || hostname.endsWith('.vimeo.com');
    } catch {
        return false;
    }
};

/**
 * Vimeo oEmbed provides everything but language. Keywords from description.
 *
 * @throws {VideoNotFoundError}
 */
export const fetchVimeoMetadata = async (videoUrl: string): Promise<VideoMetadata> => {
    const url = new URL('https://vimeo.com/api/oembed.json');

    url.searchParams.set('url', videoUrl);

    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });

    if (response.status === 404 || response.status === 403) {
        throw new VideoNotFoundError();
    }

    if (!response.ok) {
        throw new Error(`Vimeo oEmbed responded with status ${response.status}`);
    }

    const oEmbed = await response.json() as VimeoOEmbedResponse;

    return {
        url: videoUrl,
        title: oEmbed.title,
        authorName: oEmbed.author_name,
        durationSeconds: oEmbed.duration ?? null,
        languages: [],
        // remove size suffix to get larger image, e.g "https://i.vimeocdn.com/video/xxx-d_295x166"
        thumbnailUrl: oEmbed.thumbnail_url?.replace(/-d_\d+x\d+/, '-d_640x360') ?? null,
        keywords: toKeywords(oEmbed.description),
    };
};
