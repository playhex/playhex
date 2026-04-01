import './config.js';
import InMemoryCacheProvider from 'typeorm-in-memory-cache';
import { DataSource } from 'typeorm';
import { Container } from 'typedi';
import { entities } from '../shared/app/models/index.js';
import logger from './services/logger.js';
import { errorToString } from '../shared/app/utils.js';
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

export const AppDataSource = new DataSource({
    type,
    url: DATABASE_URL,
    timezone: 'Z',
    entities: Object.values(entities),
    migrations: [],
    logging: typeof logQueriesSlowerThan === 'number',
    maxQueryExecutionTime: logQueriesSlowerThan ?? undefined,
    logger: typeof logQueriesSlowerThan === 'number' ? new TypeOrmLogger() : undefined,
    cache: {
        provider: () => new InMemoryCacheProvider.default(),
    },
});

AppDataSource.initialize().catch(reason => {
    logger.crit('Could not initialize data source', { reason: errorToString(reason) });
});

/*
 * Waiting for this to be merged: https://github.com/typestack/typeorm-typedi-extensions/pull/69
 * Once merged, this could be removed, and use `@InjectRepository(Player)` instead of `@Inject('Repository<Player>')`
 */
for (const typeName in entities) {
    const type = entities[typeName as keyof typeof entities];

    Container.set(`Repository<${typeName}>`, AppDataSource.getRepository(type));
}
