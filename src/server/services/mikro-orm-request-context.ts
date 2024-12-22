import { RequestContext } from '@mikro-orm/core';
import type { Express } from 'express';
import { orm } from '../data-source';

// Creates an indentity map per request. https://mikro-orm.io/docs/identity-map
export default (app: Express) => {
    app.use((req, res, next) => {
        RequestContext.create(orm.em, next);
    });
};
