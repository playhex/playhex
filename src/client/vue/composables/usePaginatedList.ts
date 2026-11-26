import { ref, watch, type Ref, type WatchSource } from 'vue';

/**
 * "Load more" list, reloaded from first page when resetOn changes.
 */
export const usePaginatedList = <T>(
    fetchPage: (page: number) => Promise<T[]>,
    pageSize: number,
    resetOn: WatchSource | WatchSource[],
) => {
    const items = ref(null) as Ref<null | T[]>;
    const hasMore = ref(true);
    const loading = ref(false);
    let page = 0;

    // Ignore responses of requests sent before reset
    let requestId = 0;

    const loadMore = async (): Promise<void> => {
        const currentRequestId = ++requestId;
        loading.value = true;

        try {
            const nextItems = await fetchPage(page);

            if (currentRequestId !== requestId) {
                return;
            }

            items.value = [...(items.value ?? []), ...nextItems];
            hasMore.value = nextItems.length === pageSize;
            ++page;
        } finally {
            if (currentRequestId === requestId) {
                loading.value = false;
            }
        }
    };

    watch(resetOn, () => {
        items.value = null;
        hasMore.value = true;
        page = 0;
        void loadMore();
    }, { immediate: true });

    return { items, hasMore, loading, loadMore };
};
