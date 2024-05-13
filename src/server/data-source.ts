import './config';
import { camelCase } from 'typeorm/util/StringUtils';
import { DataSource, DefaultNamingStrategy } from 'typeorm';
import Container from 'typedi';
import { entities } from '../shared/app/models';

/**
 * Temporary, while migrating from prisma to typeorm.
 * Should be removed in a second step, while renaming tables to fit typeorm default naming.
 */
class PrismaNamingStrategy extends DefaultNamingStrategy
{
    tableName(targetName: string, userSpecifiedName: string | undefined): string
    {
        return userSpecifiedName ? userSpecifiedName : camelCase(targetName, true);
    }
}

const { DATABASE_URL, DATABASE_SHOW_SQL, DATABASE_SHOW_SLOW_QUERIES } = process.env;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined in .env');
}

const type = DATABASE_URL.split('://').shift();

if ('mysql' !== type && 'postgres' !== type) {
    throw new Error('DATABASE_URL expected to be like "mysql://... or postgres://...');
}

export const AppDataSource = new DataSource({
    type,
    url: DATABASE_URL,
    logging: 'true' === DATABASE_SHOW_SQL,
    timezone: 'Z',
    entities: Object.values(entities),
    subscribers: [],
    migrations: [],
    maxQueryExecutionTime: (undefined !== DATABASE_SHOW_SLOW_QUERIES && DATABASE_SHOW_SLOW_QUERIES.match(/^\d+$/)) ? parseInt(DATABASE_SHOW_SLOW_QUERIES, 10) : undefined,
    namingStrategy: new PrismaNamingStrategy(),
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
