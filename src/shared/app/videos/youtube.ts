const YOUTUBE_VIDEO_ID = /^[\w-]{11}$/;

/**
 * Extracts video id from a youtube video link, or null if not a youtube video link.
 *
 * Handles youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, /embed/, /live/
 */
export const parseYoutubeVideoId = (url: string): null | string => {
    let parsed: URL;

    try {
        parsed = new URL(url.trim());
    } catch {
        return null;
    }

    const host = parsed.hostname.replace(/^(www\.|m\.|music\.)/, '');
    let videoId: null | string = null;

    if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/')[1] ?? null;
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        const [, first, second] = parsed.pathname.split('/');

        if (first === 'watch') {
            videoId = parsed.searchParams.get('v');
        } else if (first === 'shorts' || first === 'embed' || first === 'live') {
            videoId = second ?? null;
        }
    }

    if (videoId === null || !YOUTUBE_VIDEO_ID.test(videoId)) {
        return null;
    }

    return videoId;
};

export const youtubeVideoUrl = (videoId: string): string => `https://www.youtube.com/watch?v=${videoId}`;

/**
 * Normalizes youtube links to same form, to detect duplicates.
 * Other links are returned trimmed.
 */
export const normalizeVideoUrl = (url: string): string => {
    const videoId = parseYoutubeVideoId(url);

    return videoId === null ? url.trim() : youtubeVideoUrl(videoId);
};
