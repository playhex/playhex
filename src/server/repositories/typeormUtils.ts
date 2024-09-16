import { QueryFailedError } from 'typeorm';

/**
 * Whether the error thrown by typeorm comes from a duplicate error,
 * i.e unicity constraint failed.
 */
export const isDuplicateError = (e: Error): boolean => {
    // e.message example for a duplicate:
    // "Duplicate entry 'xxx' for key 'IDX_xxx'"
    return e instanceof QueryFailedError && e.message.includes('uplicate');
};
