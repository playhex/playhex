/* eslint-disable @typescript-eslint/no-explicit-any */
import { SuperJSON } from 'superjson';
import { SuperJSONResult } from 'superjson/dist/types';

export const normalize = (data: any, root = true): any => {
    if (Array.isArray(data)) {
        if (root) {
            return data.map(item => normalize(item, false));
        }

        return data;
    }

    if (!data || 'Object' !== data.constructor.name) {
        return data;
    }

    const { json, meta } = SuperJSON.serialize(data);

    if (!json || 'Object' !== json.constructor.name) {
        throw new Error(`Expected an object here, got ${json}`);
    }

    if (meta) {
        (json as any).__meta = meta;
    }

    return json;
};

export const denormalize = (data: any, root = true): any => {
    if (Array.isArray(data)) {
        if (root) {
            return data.map(item => denormalize(item, false));
        }

        return data;
    }

    if (!data.__meta) {
        return data;
    }

    const superJson: SuperJSONResult = {
        json: data,
        meta: data.__meta,
    };

    delete (superJson.json as any)['__meta'];

    return SuperJSON.deserialize(superJson);
};
