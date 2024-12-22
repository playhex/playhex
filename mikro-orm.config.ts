import './src/server/config';
import { defineConfig } from '@mikro-orm/mysql';
import { entities } from './src/shared/app/models';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in .env');
}

export default defineConfig({
    clientUrl: process.env.DATABASE_URL,
    entities: Object.values(entities),
});
