import { Service } from 'typedi';
import type { VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { parseYoutubeVideoId } from '../../../shared/app/videos/youtube.js';
import { fetchYoutubeMetadata } from './youtubeMetadata.js';
import { fetchVimeoMetadata, isVimeoUrl } from './vimeoMetadata.js';
import { fetchDailymotionMetadata, parseDailymotionVideoId } from './dailymotionMetadata.js';
import { fetchHtmlMetadata } from './htmlMetadata.js';
import { fetchPeertubeMetadata } from './peertubeMetadata.js';
import { parsePeertubeVideo } from '../../../shared/app/videos/videoPlatform.js';
import { VideoMetadataUnavailableError, VideoNotFoundError } from './metadataErrors.js';

/**
 * Fetches video infos from a link to prefill video submission form,
 * using the right function depending on link source.
 */
@Service()
export default class VideoMetadataService
{
    /**
     * @throws {VideoNotFoundError}
     * @throws {VideoMetadataUnavailableError}
     */
    async fetchMetadata(url: string): Promise<VideoMetadata>
    {
        const youtubeVideoId = parseYoutubeVideoId(url);

        if (youtubeVideoId !== null) {
            return await fetchYoutubeMetadata(youtubeVideoId);
        }

        if (isVimeoUrl(url)) {
            return await fetchVimeoMetadata(url);
        }

        const dailymotionVideoId = parseDailymotionVideoId(url);

        if (dailymotionVideoId !== null) {
            return await fetchDailymotionMetadata(dailymotionVideoId);
        }

        const peertubeVideo = parsePeertubeVideo(url);

        if (peertubeVideo !== null) {
            try {
                return await fetchPeertubeMetadata(peertubeVideo.origin, peertubeVideo.videoId);
            } catch (e) {
                // Path looks like PeerTube but may be another site, without PeerTube api (so 404 too):
                // fallback to page meta tags, which also tells if page does not exist.
                if (!(e instanceof VideoMetadataUnavailableError) && !(e instanceof VideoNotFoundError)) {
                    throw e;
                }
            }
        }

        return await fetchHtmlMetadata(url);
    }
}
