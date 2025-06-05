/**
 * Prevent calling an async function twice at same time.
 * Make sure all calls are called one by one.
 * If another call is running, wait for it before calling it again.
 * If a call is already waiting, returns same promise.
 *
 * Used to prevent persisting an entity multiple times at once.
 *
 * Example use:
 * ```
 * const safePersist = serialAsync(async () => repository.save(entity));
 * ```
 *
 * - Case 1:
 * ```
 * await safePersist(); // persist now
 * ```
 *
 * - Case 2:
 * ```
 * safePersist(); // persist now
 * entity.field = 'updated value'; // probable entity change
 * safePersist(); // persisted twice, sequencially, after first persist is done
 * ```
 *
 * - Case 3:
 * ```
 * safePersist(); // persist now
 * safePersist(); // persisted twice, sequencially, after first persist is done
 * safePersist(); // won't persist a third time, returns same promise as second one.
 * ```
 */
export const serialAsync = <T>(callback: () => Promise<T>): () => Promise<T> => {
    let currentPromise: Promise<T> | null = null;
    let nextCallQueued = false;
    let nextPromise: Promise<T> | null = null;
    let resolveNext: ((value: T) => void) | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectNext: ((reason?: any) => void) | null = null;

    async function runCallback(): Promise<T> {
        try {
            const result = await callback();
            return result;
        } catch (err) {
            throw err;
        } finally {
            currentPromise = null;

            if (nextCallQueued) {
                nextCallQueued = false;

                try {
                    const result = await runCallback();
                    resolveNext?.(result);
                } catch (err) {
                    rejectNext?.(err);
                } finally {
                    nextPromise = null;
                    resolveNext = null;
                    rejectNext = null;
                }
            }
        }
    }

    async function call(): Promise<T> {
        if (!currentPromise) {
            currentPromise = runCallback();
            return currentPromise;
        }

        if (!nextCallQueued) {
            nextCallQueued = true;
            nextPromise = new Promise<T>((resolve, reject) => {
                resolveNext = resolve;
                rejectNext = reject;
            });
        }

        return nextPromise!;
    }

    return call;
};
