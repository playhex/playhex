import './config.js';
import InMemoryCacheProvider from 'typeorm-in-memory-cache';
import { DataSource } from 'typeorm';
import { Container } from 'typedi';
import { entities } from '../shared/app/models/index.js';
import { StatsLogger } from './services/statslogger.js';

const { DATABASE_URL, DATABASE_SHOW_SQL, DATABASE_SHOW_SLOW_QUERIES } = process.env;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined in .env');
}

const scheme = DATABASE_URL.split('://').shift();
const type = scheme === 'postgresql' ? 'postgres' : scheme;

if (type !== 'mysql' && type !== 'postgres') {
    throw new Error('DATABASE_URL expected to be like "mysql://... or postgresql://...');
}

const logger = new StatsLogger();

setInterval(() => logger.dump(), 2000);

export const AppDataSource = new DataSource({
    type,
    url: DATABASE_URL,
    logging: DATABASE_SHOW_SQL === 'true',
    timezone: 'Z',
    entities: Object.values(entities),
    migrations: [],
    maxQueryExecutionTime: -1,
    cache: {
        provider: () => new InMemoryCacheProvider.default(),
    },
    logger,
});

AppDataSource.initialize();

/*
 * Waiting for this to be merged: https://github.com/typestack/typeorm-typedi-extensions/pull/69
 * Once merged, this could be removed, and use `@InjectRepository(Player)` instead of `@Inject('Repository<Player>')`
 */
for (const typeName in entities) {
    const type = entities[typeName as keyof typeof entities];

    Container.set(`Repository<${typeName}>`, AppDataSource.getRepository(type));
}
