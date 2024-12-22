import './config';
import { MikroORM } from '@mikro-orm/mysql';
import Container from 'typedi';
import { entities } from '../shared/app/models';

const { DATABASE_URL, DATABASE_SHOW_SQL, DATABASE_SHOW_SLOW_QUERIES } = process.env;

if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined in .env');
}

const scheme = DATABASE_URL.split('://').shift();
const type = scheme === 'postgresql' ? 'postgres' : scheme;

if ('mysql' !== type && 'postgres' !== type) {
    throw new Error('DATABASE_URL expected to be like "mysql://... or postgresql://...');
}

export const orm = MikroORM.initSync({
    clientUrl: process.env.DATABASE_URL,
    entities: Object.values(entities),
    allowGlobalContext: true,
    serialization: {
        forceObject: true,
    },
    debug: true, // TODO
});

for (const typeName in entities) {
    const type = entities[typeName as keyof typeof entities];

    Container.set(`EntityRepository<${typeName}>`, orm.em.getRepository(type));
}
