import { toVideoPublishedAt, type VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { safeFetch, SafeFetchError } from '../safeFetch.js';
import { VideoMetadataUnavailableError, VideoNotFoundError } from './metadataErrors.js';
import { toKeywords } from './toKeywords.js';

const API_MAX_SIZE = 512 * 1024;

type PeertubeVideoResponse = {
    shortUUID?: string;
    uuid: string;
    name: string;
    duration: number;
    publishedAt?: null | string;
    originallyPublishedAt?: null | string;
    previewPath?: null | string;
    thumbnailPath?: null | string;
    tags?: string[];
    description?: null | string;
    channel?: { displayName?: string };
    account?: { displayName?: string };
};

/**
 * Asks the PeerTube instance api, public, no key needed.
 * Instance is any host given by player, so fetched with safeFetch.
 * Author is the channel, like youtube. Keywords from tags, or description.
 *
 * @param origin Instance, e.g "https://framatube.org"
 *
 * @throws {VideoNotFoundError}
 * @throws {VideoMetadataUnavailableError} Also if not a PeerTube instance
 */
export const fetchPeertubeMetadata = async (origin: string, videoId: string): Promise<VideoMetadata> => {
    let response: Awaited<ReturnType<typeof safeFetch>>;

    try {
        response = await safeFetch(`${origin}/api/v1/videos/${videoId}`, { maxSize: API_MAX_SIZE });
    } catch (e) {
        if (e instanceof SafeFetchError) {
            throw new VideoMetadataUnavailableError(e.message);
        }

        throw e;
    }

    if (response.status === 404 || response.status === 410) {
        throw new VideoNotFoundError();
    }

    if (response.status !== 200 || response.mimeType !== 'application/json') {
        throw new VideoMetadataUnavailableError(`Unexpected response: ${response.status} ${response.mimeType}`);
    }

    let video: PeertubeVideoResponse;

    try {
        video = JSON.parse(response.body.toString('utf8')) as PeertubeVideoResponse;
    } catch {
        throw new VideoMetadataUnavailableError('Invalid PeerTube api response');
    }

    if (typeof video?.name !== 'string' || typeof video.uuid !== 'string') {
        throw new VideoMetadataUnavailableError('Invalid PeerTube api response');
    }

    const thumbnailPath = video.previewPath ?? video.thumbnailPath ?? null;

    return {
        url: `${origin}/w/${video.shortUUID ?? video.uuid}`,
        title: video.name,
        authorName: video.channel?.displayName ?? video.account?.displayName ?? '',
        durationSeconds: typeof video.duration === 'number' && video.duration > 0 ? video.duration : null,
        publishedAt: toVideoPublishedAt(video.originallyPublishedAt ?? video.publishedAt),
        thumbnailUrl: thumbnailPath === null ? null : new URL(thumbnailPath, origin).toString(),
        keywords: toKeywords(video.tags?.length ? video.tags : video.description),
    };
};
