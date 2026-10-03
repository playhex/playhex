/**
 * Lowercase, without accents, to compare "Methode" with "méthode".
 */
export const normalizeSearchText = (text: string): string => text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
;

type SearchableVideo = {
    title: string;
    authorName: string;
    keywords: null | string;
    languages: string[];
};

export type VideoFilters = {
    /**
     * Text typed by user, searched in title, video author name, and keywords.
     * Every word must be found.
     */
    search: string;

    /**
     * Only videos available in at least one of these languages.
     * Empty for all.
     */
    languages: string[];
};

export const filterVideos = <T extends SearchableVideo>(videos: T[], { search, languages }: VideoFilters): T[] => {
    const words = normalizeSearchText(search).split(/\s+/).filter(word => word !== '');

    return videos.filter(video => {
        if (languages.length > 0 && !video.languages.some(language => languages.includes(language))) {
            return false;
        }

        if (words.length === 0) {
            return true;
        }

        const haystack = normalizeSearchText(`${video.title} ${video.authorName} ${video.keywords ?? ''}`);

        return words.every(word => haystack.includes(word));
    });
};
