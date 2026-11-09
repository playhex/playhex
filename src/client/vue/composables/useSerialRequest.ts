import { onScopeDispose, Ref, ref, watch, WatchSource } from 'vue';

/**
 * Runs request when source changes, without stacking requests:
 * - changes are debounced,
 * - only one request runs at a time. If source changes while a request is running,
 *   only one more request is sent after it, with latest values.
 *
 * Runs request immediately once.
 *
 * Returns loading, true from a source change until latest request is done,
 * e.g to show results are outdated.
 *
 * @param source What to watch, e.g filters
 * @param request Async callback, should read latest values itself
 * @param debounceMs Delay to wait for no more changes before sending request
 */
export const useSerialRequest = (
    source: WatchSource,
    request: () => Promise<void>,
    debounceMs = 250,
): { loading: Ref<boolean> } => {
    let timeout: null | ReturnType<typeof setTimeout> = null;
    let running = false;
    let pending = false;
    const loading = ref(true);

    const run = async (): Promise<void> => {
        if (running) {
            pending = true;
            return;
        }

        running = true;

        // A failed request must not prevent sending the pending one
        do {
            pending = false;

            try {
                await request();
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error(e);
            }
        } while (pending);

        running = false;

        if (timeout === null) {
            loading.value = false;
        }
    };

    watch(source, () => {
        loading.value = true;

        if (timeout !== null) {
            clearTimeout(timeout);
        }

        timeout = setTimeout(() => {
            timeout = null;
            void run();
        }, debounceMs);
    }, { deep: true });

    onScopeDispose(() => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
    });

    void run();

    return { loading };
};
