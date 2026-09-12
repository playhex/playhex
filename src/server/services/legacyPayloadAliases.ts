import { NextFunction, Request, Response } from 'express';

/**
 * TEMPORARY backward compatibility shim, for players still running a client
 * built before HostedGame has been renamed to Game.
 *
 * Their client reads `hostedGameToPlayers` and `hostedGame`, which no longer
 * exist in our payloads. We keep emitting the new names, and duplicate the
 * renamed nodes under their legacy name so both clients are served.
 *
 * Only server -> client payloads need this: no request body, websocket
 * argument, query parameter nor room name carries a renamed key.
 *
 * TO REMOVE once enough time has passed for clients to have reloaded:
 * delete this file, its middleware registration in controllers/http/index.ts,
 * and the addLegacyAliases() calls around websocket payloads.
 */

/**
 * Current property name => name the old clients are expecting.
 */
const legacyAliases: [current: string, legacy: string][] = [
    ['gameToPlayers', 'hostedGameToPlayers'],
    ['game', 'hostedGame'],
];

const shouldVisit = (value: unknown): value is object => typeof value === 'object'
    && value !== null
    && !(value instanceof Date)
;

/**
 * Returns a copy of the payload where every renamed node is also available
 * under its legacy name. Both names share the same reference, nothing is
 * deep-copied. Does not mutate the payload: it can be an entity still in use
 * elsewhere in the application.
 */
export const addLegacyAliases = <T>(payload: T, visited: Map<object, unknown> = new Map()): T => {
    if (!shouldVisit(payload)) {
        return payload;
    }

    // Already visited: reuse the same copy, so shared references stay shared
    // and circular references do not loop forever.
    if (visited.has(payload)) {
        return visited.get(payload) as T;
    }

    if (Array.isArray(payload)) {
        const copy: unknown[] = [];

        visited.set(payload, copy);

        for (const item of payload) {
            copy.push(addLegacyAliases(item, visited));
        }

        return copy as T;
    }

    const copy: { [key: string]: unknown } = {};

    visited.set(payload, copy);

    // Own enumerable properties only, same as what JSON.stringify() would have kept.
    for (const [key, value] of Object.entries(payload)) {
        copy[key] = addLegacyAliases(value, visited);
    }

    for (const [current, legacy] of legacyAliases) {
        if (current in copy && !(legacy in copy)) {
            copy[legacy] = copy[current];
        }
    }

    return copy as T;
};

/**
 * Adds legacy aliases to every json response.
 * Must be registered before the api controllers, so res.json() is already
 * wrapped when routing-controllers sends its transformed result.
 */
export const legacyAliasesMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const json = res.json.bind(res);

    res.json = body => json(addLegacyAliases(body));

    next();
};
