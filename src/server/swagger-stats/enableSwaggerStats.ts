import { type Express } from 'express';
import { getMetadataArgsStorage } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import swStats from 'swagger-stats';

const { SWAGGER_STATS_PASSWORD } = process.env;

export const enableSwaggerStats = (app: Express) => {
    if (undefined === SWAGGER_STATS_PASSWORD || SWAGGER_STATS_PASSWORD === '') {
        return;
    }

    const storage = getMetadataArgsStorage();
    const swaggerSpec = routingControllersToSpec(storage);

    app.use(swStats.getMiddleware({
        swaggerSpec,
        authentication: SWAGGER_STATS_PASSWORD !== 'no_password',
        onAuthenticate(req, username, password) {
            return username === 'admin'
                && SWAGGER_STATS_PASSWORD === password
            ;
        },

        timelineBucketDuration: 60000 * 12,
        sessionMaxAge: 86400 * 30,
    }));
};
