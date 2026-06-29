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
 */
export const patchAppDataSourceDestroy = (dataSource: DataSource): void => {
    const baseDestroy = dataSource.destroy.bind(dataSource);

    dataSource.destroy = async () => {
        try {
            await baseDestroy();
        } catch {
            /* ignore */
        }
    };
};
