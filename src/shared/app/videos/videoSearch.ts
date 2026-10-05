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
};

export type VideoFilters = {
    /**
     * Text typed by user, searched in title, video author name, and keywords.
     * Every word must be found.
     */
    search: string;
};

export const filterVideos = <T extends SearchableVideo>(videos: T[], { search }: VideoFilters): T[] => {
    const words = normalizeSearchText(search).split(/\s+/).filter(word => word !== '');

    return videos.filter(video => {
        if (words.length === 0) {
            return true;
        }

        const haystack = normalizeSearchText(`${video.title} ${video.authorName} ${video.keywords ?? ''}`);

        return words.every(word => haystack.includes(word));
    });
};

export type VideoSort = 'publishedAt' | 'createdAt';

type SortableVideo = {
    publishedAt: null | Date;
    createdAt: Date;
};

/**
 * @returns New array, most recent first.
 *          When sorting by publication date, videos with unknown publication date
 *          come last, by date added.
 */
export const sortVideos = <T extends SortableVideo>(videos: T[], sort: VideoSort): T[] => [...videos]
    .sort((a, b) => {
        if (sort === 'publishedAt' && (a.publishedAt === null) !== (b.publishedAt === null)) {
            return a.publishedAt === null ? 1 : -1;
        }

        const dateA = (sort === 'publishedAt' ? a.publishedAt : null) ?? a.createdAt;
        const dateB = (sort === 'publishedAt' ? b.publishedAt : null) ?? b.createdAt;

        return dateB.getTime() - dateA.getTime();
    })
;
