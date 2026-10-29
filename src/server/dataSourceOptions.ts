import './config.js';
import InMemoryCacheProvider from 'typeorm-in-memory-cache';
import { DataSourceOptions } from 'typeorm';
import { entities } from '../shared/app/models/index.js';
import { TypeOrmLogger } from './services/TypeORMLogger.js';

const { DATABASE_URL, DATABASE_LOG_QUERIES_SLOWER_THAN } = process.env;

const logQueriesSlowerThan = typeof DATABASE_LOG_QUERIES_SLOWER_THAN !== 'undefined'
    ? parseInt(DATABASE_LOG_QUERIES_SLOWER_THAN, 10)
    : undefined
;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined in .env');
}

const scheme = DATABASE_URL.split('://').shift();
const type = scheme === 'postgresql' ? 'postgres' : scheme;

if (type !== 'mysql' && type !== 'postgres') {
    throw new Error('DATABASE_URL expected to be like "mysql://... or postgresql://...');
}

export const dataSourceOptions: DataSourceOptions = {
    type,
    url: DATABASE_URL,
    timezone: 'Z',
    entities: Object.values(entities),
    migrations: [import.meta.dirname + '/migrations/*.ts'],
    migrationsTableName: 'migrations',
    logging: typeof logQueriesSlowerThan === 'number',
    maxQueryExecutionTime: logQueriesSlowerThan ?? undefined,
    logger: typeof logQueriesSlowerThan === 'number' ? new TypeOrmLogger() : undefined,
    cache: {
        provider: () => new InMemoryCacheProvider.default(),
    },
    invalidWhereValuesBehavior: {
        null: 'throw', // keep default, must use IsNull()
        undefined: 'ignore', // to make this example not throw (since typeorm 1.0.0): where { deletedAt: onlyAlive ? IsNull() : undefined }
    },
};
