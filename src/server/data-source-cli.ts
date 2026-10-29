import { DataSource } from 'typeorm';
import { dataSourceOptions } from './dataSourceOptions.js';

/**
 * Data source for typeorm CLI (migrations).
 * Not initialized here, the CLI initializes it itself,
 * and not patched so that a failing command exits with a non-zero code.
 */
export const CliDataSource = new DataSource(dataSourceOptions);
