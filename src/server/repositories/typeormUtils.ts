import { UniqueConstraintViolationException } from '@mikro-orm/core';

/**
 * Whether the error thrown by typeorm comes from a duplicate error,
 * i.e unicity constraint failed.
 * TODO rename file
 */
export const isDuplicateError = (e: Error): boolean => {
    return e instanceof UniqueConstraintViolationException;
};
