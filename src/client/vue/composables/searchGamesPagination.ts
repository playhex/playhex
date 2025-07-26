import { computed, Ref, watch } from 'vue';
import SearchGamesParameters from '../../../shared/app/SearchGamesParameters.js';

/**
 * Pagination helper.
 *
 * Compute and returns total page count to display, and methods to go back and forth in pages.
 *
 * @param searchGamesParameters Filters, used to get pagination values
 * @param totalResults Ref that must be updated manually with the count of total results returned by filter
 * @param defaultPageSize Page size, used when paginationPageSize is let empty
 */
export const useSearchGamesPagination = (
    searchGamesParameters: Ref<SearchGamesParameters>,
    totalResults: Ref<null | number>,
    defaultPageSize: number,
) => {
    const totalPages = computed(() => {
        if (totalResults.value === null || totalResults.value === 0) {
            return 0;
        }

        return 1 + Math.floor(totalResults.value / (searchGamesParameters.value.paginationPageSize ?? defaultPageSize));
    });

    const capPage = (page: number): number => {
        if (page < 0) {
            return 0;
        }

        if (page >= totalPages.value) {
            return Math.max(0, totalPages.value - 1);
        }

        return page;
    };

    const goPageNext = () => {
        searchGamesParameters.value.paginationPage = capPage((searchGamesParameters.value.paginationPage ?? 0) + 1);
    };

    const goPagePrevious = () => {
        searchGamesParameters.value.paginationPage = capPage((searchGamesParameters.value.paginationPage ?? 0) - 1);
    };

    // Cap page when total pages count changed.
    // if less games after filter change, set page to max page to prevent empty page
    watch(totalPages, () => {
        searchGamesParameters.value.paginationPage = capPage(searchGamesParameters.value.paginationPage ?? 0);
    });

    return {
        totalPages,
        goPagePrevious,
        goPageNext,
    };
};
