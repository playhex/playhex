import { parseYoutubeVideoId } from './youtube.js';

export type VideoPlatformKey = 'youtube' | 'vimeo' | 'dailymotion' | 'twitch' | 'tiktok' | 'peertube' | 'other';

export type VideoPlatform = {
    key: VideoPlatformKey;

    /**
     * Displayed name: platform name, or hostname for other sites.
     */
    name: string;
};

/**
 * PeerTube short uuid (base58, 22 chars), or uuid.
 */
const PEERTUBE_VIDEO_ID = /^([1-9A-HJ-NP-Za-km-z]{22}|[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/;

/**
 * PeerTube instances can be on any domain, so detected from path:
 * /w/<id>, /videos/watch/<id>, /videos/embed/<id>
 *
 * @returns Instance origin and video id, or null if not a PeerTube video link
 */
export const parsePeertubeVideo = (url: string): null | { origin: string, videoId: string } => {
    let parsed: URL;

    try {
        parsed = new URL(url.trim());
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return null;
    }

    const videoId = parsed.pathname.match(/^\/(?:w|videos\/watch|videos\/embed)\/([^/]+)\/?$/)?.[1];

    if (!videoId || !PEERTUBE_VIDEO_ID.test(videoId)) {
        return null;
    }

    return { origin: parsed.origin, videoId };
};

const hostname = (url: string): null | string => {
    try {
        return new URL(url.trim()).hostname.replace(/^www\./, '');
    } catch {
        return null;
    }
};

const isHostOf = (host: string, domain: string): boolean => host === domain || host.endsWith(`.${domain}`);

/**
 * Which platform a video link is on, to display an icon and name.
 */
export const videoPlatform = (url: string): VideoPlatform => {
    const host = hostname(url);

    if (host === null) {
        return { key: 'other', name: url };
    }

    if (parseYoutubeVideoId(url) !== null || isHostOf(host, 'youtube.com') || host === 'youtu.be') {
        return { key: 'youtube', name: 'YouTube' };
    }

    if (isHostOf(host, 'vimeo.com')) {
        return { key: 'vimeo', name: 'Vimeo' };
    }

    if (isHostOf(host, 'dailymotion.com') || host === 'dai.ly') {
        return { key: 'dailymotion', name: 'Dailymotion' };
    }

    if (isHostOf(host, 'twitch.tv')) {
        return { key: 'twitch', name: 'Twitch' };
    }

    if (isHostOf(host, 'tiktok.com')) {
        return { key: 'tiktok', name: 'TikTok' };
    }

    if (parsePeertubeVideo(url) !== null) {
        return { key: 'peertube', name: 'PeerTube' };
    }

    return { key: 'other', name: host };
};
