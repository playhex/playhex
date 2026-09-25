import { register } from 'node:module';

register('ts-node/esm', { parentURL: import.meta.url });

// Load @playhex/* packages from their typescript sources (see "source" in their package.json exports), not from dist/
register('data:text/javascript,export const resolve = (specifier, context, next) => next(specifier, { ...context, conditions: ["source", ...context.conditions] });', { parentURL: import.meta.url });
