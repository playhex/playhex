import { DataSource } from 'typeorm';
import { Container } from 'typedi';
import { entities } from '../shared/app/models/index.js';
import logger from './services/logger.js';
import { errorToString } from '../shared/app/utils.js';
import { patchAppDataSourceDestroy } from './repositories/typeormUtils.js';
import { dataSourceOptions } from './dataSourceOptions.js';

export const AppDataSource = new DataSource(dataSourceOptions);

patchAppDataSourceDestroy(AppDataSource);

/**
 * Await this instead of calling AppDataSource.initialize(),
 * which throws if called while already initializing or initialized.
 */
export const appDataSourceInitialized: Promise<void> = AppDataSource.initialize().then(() => undefined);

appDataSourceInitialized.catch(reason => {
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
