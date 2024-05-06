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
