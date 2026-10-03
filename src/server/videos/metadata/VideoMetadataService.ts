import { Service } from 'typedi';
import type { VideoMetadata } from '../../../shared/app/videos/videoInput.js';
import { parseYoutubeVideoId } from '../../../shared/app/videos/youtube.js';
import { fetchYoutubeMetadata } from './youtubeMetadata.js';
import { fetchVimeoMetadata, isVimeoUrl } from './vimeoMetadata.js';
import { fetchDailymotionMetadata, parseDailymotionVideoId } from './dailymotionMetadata.js';
import { fetchHtmlMetadata } from './htmlMetadata.js';

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

        return await fetchHtmlMetadata(url);
    }
}
