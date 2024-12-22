/* eslint-disable @typescript-eslint/no-explicit-any */
import SuperJSON from 'superjson';
import { JSONObject } from 'superjson/dist/types';
import { entities, models } from '../shared/app/models';
import { instanceToPlain, plainToInstance } from '../shared/app/class-transformer-custom';

/*
 * Used to serialize/deserialize messages through socket,
 * when they contains special objects like date,
 * or model instance like Game, Player.
 *
 * Model instances will be tranformed using class-transformer
 * and follow Expose groups and all annotations.
 */

for (const typeName in entities) {
    const type = entities[typeName as keyof typeof entities];

    SuperJSON.registerCustom<typeof type, JSONObject>(
        {
            isApplicable: (v): v is typeof type => v instanceof type,
            serialize: v => instanceToPlain(v),
            deserialize: v => plainToInstance(type as any, v),
        },
        typeName,
    );
}

for (const typeName in models) {
    const type = models[typeName as keyof typeof models];

    SuperJSON.registerCustom<typeof type, JSONObject>(
        {
            isApplicable: (v): v is typeof type => v instanceof type,
            serialize: v => instanceToPlain(v),
            deserialize: v => plainToInstance(type as any, v),
        },
        typeName,
    );
}
