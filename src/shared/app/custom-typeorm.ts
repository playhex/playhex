import { Column as BaseColumn, ColumnOptions } from 'typeorm';

/**
 * An uuid column.
 *
 * Using { type: 'uuid' } create a varchar(255) instead of char(36).
 * This decorator fixes this, waiting for this to be solved:
 * https://github.com/typeorm/typeorm/issues/7228
 */
export const ColumnUUID = (options: ColumnOptions) => BaseColumn({
    ...options,
    type: 'char',
    length: 36,
});

/**
 * Type text for columns that need more than 32kb of data.
 *
 * To be used instead of 'text' for columns that require more than 32k.
 * By default, 'text' uses text in mysql (<32k) and for pg and sqlite too (32k or more).
 * So mysql requires 'longtext', which is not working in others dbms.
 * This variable solve this by using longtext for mysql and text for others.
 */
export const longText = typeof process === 'undefined'
    ? 'text'
    : process.env.DATABASE_URL?.startsWith('mysql:') ? 'longtext' : 'text';
