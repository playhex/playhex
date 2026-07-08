import { DataSource, QueryFailedError } from 'typeorm';

/**
 * Whether the error thrown by typeorm comes from a duplicate error,
 * i.e unicity constraint failed.
 */
export const isDuplicateError = (e: unknown): e is QueryFailedError => {
    // e.message example for a duplicate:
    // "Duplicate entry 'xxx' for key 'IDX_xxx'"
    return e instanceof QueryFailedError && e.message.includes('uplicate');
};

/**
 * When TypeOrm fails during initialize(), it calls destroy() to clean up.
 * If destroy() also throws (e.g. pool was never set), it masks the original error.
 * Patching destroy() on the instance to swallow its own errors lets the real error propagate.
 *
 * Example: Running `typeorm migration:generate` with a schema error
 * will throw with an unrelated error message.
 * This patch will display the actual schema error.
 *
 * destroy() is only ever called from one-off CLI scripts (`yarn hex ...`,
 * `yarn typeorm ...`), never from the long-running server. mysql2's pool.end()
 * sends a QUIT command to each pooled connection and waits for the server's
 * response before closing the socket, which does not reliably happen in these
 * short-lived processes and leaves them hanging. Force exit once cleanup is done.
 */
export const patchAppDataSourceDestroy = (dataSource: DataSource): void => {
    const baseDestroy = dataSource.destroy.bind(dataSource);

    dataSource.destroy = async () => {
        try {
            await baseDestroy();
        } catch {
            /* ignore */
        }

        process.exit(0);
    };
};
