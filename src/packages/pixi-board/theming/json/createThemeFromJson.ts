import { Color } from 'pixi.js';
import { Anchor44Style, BoardTheme, SidesAlpha, ThemeColors, ThemeDefinition, ThemeMetadata } from '../types.js';
import { JsonParamType, JsonRendererEntry, jsonRenderersRegistry } from './registry.js';

export class JsonThemeError extends Error
{
    constructor(path: string, message: string)
    {
        super(`${path}: ${message}`);
    }
}

type JsonObject = { [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);

const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Keys that contain an object with a `type`.
 * When a variant changes the type, the object is replaced instead of merged,
 * to not keep params of the previous type.
 */
const typedKeys = ['background', 'board', 'stones', 'lastMove', 'swappable', 'swapped', 'coords'];

/**
 * Deep merge `override` into `base`. Arrays are replaced.
 */
const merge = (base: JsonObject, override: JsonObject): JsonObject => {
    const merged: JsonObject = { ...base };

    for (const [key, value] of Object.entries(override)) {
        const baseValue = merged[key];

        if (
            isObject(baseValue)
            && isObject(value)
            && !(typedKeys.includes(key) && value.type !== undefined && value.type !== baseValue.type)
        ) {
            merged[key] = merge(baseValue, value);
        } else {
            merged[key] = value;
        }
    }

    return merged;
};

/**
 * Checks that light and dark variants define the same keys,
 * else a key defined in only one variant would be kept in the other mode once resolved.
 * Params of typed keys are not checked, renderers are created separately for each variant.
 */
const expectSameKeys = (light: JsonObject, dark: JsonObject, path: string): void => {
    for (const key of new Set([...Object.keys(light), ...Object.keys(dark)])) {
        const keyPath = path === '' ? key : `${path}.${key}`;

        if (light[key] === undefined || dark[key] === undefined) {
            const [set, missing] = light[key] === undefined ? ['dark', 'light'] : ['light', 'dark'];

            throw new JsonThemeError(`${missing}.${keyPath}`, `required because set in ${set}. Set it in theme, or in both light and dark`);
        }

        if (!typedKeys.includes(key) && isObject(light[key]) && isObject(dark[key])) {
            expectSameKeys(light[key], dark[key], keyPath);
        }
    }
};

const expectObject = (value: unknown, path: string): JsonObject => {
    if (!isObject(value)) {
        throw new JsonThemeError(path, 'expected an object');
    }

    return value;
};

const parseColor = (value: unknown, path: string): number => {
    if (typeof value !== 'string') {
        throw new JsonThemeError(path, 'expected a color string, i.e "#dc3545"');
    }

    try {
        return new Color(value).toNumber();
    } catch {
        throw new JsonThemeError(path, `invalid color "${value}"`);
    }
};

const parseParam = (value: unknown, type: JsonParamType, path: string): unknown => {
    switch (type) {
        case 'color':
            return parseColor(value, path);

        case 'colorPair':
            if (!Array.isArray(value) || value.length !== 2) {
                throw new JsonThemeError(path, 'expected an array of 2 colors');
            }

            return [parseColor(value[0], `${path}[0]`), parseColor(value[1], `${path}[1]`)];

        case 'number':
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new JsonThemeError(path, 'expected a number');
            }

            return value;

        case 'alpha':
            if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
                throw new JsonThemeError(path, 'expected a number between 0 and 1');
            }

            return value;

        case 'string':
            if (typeof value !== 'string' || value === '') {
                throw new JsonThemeError(path, 'expected a non-empty string');
            }

            return value;

        case 'boolean':
            if (typeof value !== 'boolean') {
                throw new JsonThemeError(path, 'expected true or false');
            }

            return value;
    }
};

/**
 * Validates `{ type: ..., ...params }` and creates renderer from registry.
 */
const createRenderer = <R>(
    value: unknown,
    entries: { [type: string]: JsonRendererEntry<R> },
    path: string,
): R => {
    const object = expectObject(value, path);
    const { type, ...rawParams } = object;

    if (typeof type !== 'string') {
        throw new JsonThemeError(`${path}.type`, `expected one of: ${Object.keys(entries).join(', ')}`);
    }

    const entry = entries[type];

    if (!entry) {
        throw new JsonThemeError(`${path}.type`, `unknown type "${type}", expected one of: ${Object.keys(entries).join(', ')}`);
    }

    const params: JsonObject = {};

    for (const [name, value] of Object.entries(rawParams)) {
        if (!entry.params[name]) {
            throw new JsonThemeError(`${path}.${name}`, `unknown param for type "${type}"`);
        }

        params[name] = parseParam(value, entry.params[name].type, `${path}.${name}`);

        const { values } = entry.params[name];

        if (values && !values.includes(params[name] as string)) {
            throw new JsonThemeError(`${path}.${name}`, `expected one of: ${values.join(', ')}`);
        }
    }

    for (const [name, { required }] of Object.entries(entry.params)) {
        if (required && params[name] === undefined) {
            throw new JsonThemeError(`${path}.${name}`, `required for type "${type}"`);
        }
    }

    return entry.create(params);
};

const createColors = (value: unknown, path: string): ThemeColors => {
    const colors = expectObject(value, path);

    const optional = ['coordsLetters', 'coordsNumbers'] as const;

    for (const key of Object.keys(colors)) {
        if (!['player1', 'player2', 'text', ...optional].includes(key)) {
            throw new JsonThemeError(`${path}.${key}`, 'unknown color, expected one of: player1, player2, text, coordsLetters, coordsNumbers');
        }
    }

    const themeColors: ThemeColors = {
        player1: parseColor(colors.player1, `${path}.player1`),
        player2: parseColor(colors.player2, `${path}.player2`),
        text: parseColor(colors.text, `${path}.text`),
    };

    for (const key of optional) {
        if (colors[key] !== undefined) {
            themeColors[key] = parseColor(colors[key], `${path}.${key}`);
        }
    }

    return themeColors;
};

const createAnchor44 = (value: unknown, path: string): Anchor44Style => {
    const anchor44 = expectObject(value, path);
    const params: { [key: string]: JsonParamType } = { color: 'color', alpha: 'alpha', size: 'number', shape: 'string' };
    const style: { [key: string]: unknown } = {};

    for (const [key, value] of Object.entries(anchor44)) {
        if (!params[key]) {
            throw new JsonThemeError(`${path}.${key}`, 'unknown key, expected one of: color, alpha, size, shape');
        }

        style[key] = parseParam(value, params[key], `${path}.${key}`);
    }

    if (style.shape !== undefined && style.shape !== 'circle' && style.shape !== 'square') {
        throw new JsonThemeError(`${path}.shape`, 'expected one of: circle, square');
    }

    return style;
};

const createSidesAlpha = (value: unknown, path: string): SidesAlpha => {
    const sidesAlpha = expectObject(value, path);
    const result: SidesAlpha = {};

    for (const [key, value] of Object.entries(sidesAlpha)) {
        if (key !== 'highlighted' && key !== 'faded') {
            throw new JsonThemeError(`${path}.${key}`, 'unknown key, expected one of: highlighted, faded');
        }

        result[key] = parseParam(value, 'alpha', `${path}.${key}`) as number;
    }

    return result;
};

/**
 * @param variant `theme` merged with light or dark
 * @param path Where errors come from, i.e "theme+dark"
 */
const createTheme = (variant: JsonObject, path: string): BoardTheme => {
    for (const key of Object.keys(variant)) {
        if (!['colors', 'background', 'board', 'stones', 'sidesAlpha', 'anchor44', 'lastMove', 'swappable', 'swapped', 'coords'].includes(key)) {
            throw new JsonThemeError(`${path}.${key}`, 'unknown key, expected one of: colors, background, board, stones, sidesAlpha, anchor44, lastMove, swappable, swapped, coords');
        }
    }

    const theme: BoardTheme = {
        colors: createColors(variant.colors, `${path}.colors`),
        board: createRenderer(variant.board, jsonRenderersRegistry.board, `${path}.board`),
        stones: createRenderer(variant.stones, jsonRenderersRegistry.stones, `${path}.stones`),
    };

    if (variant.sidesAlpha !== undefined) {
        theme.sidesAlpha = createSidesAlpha(variant.sidesAlpha, `${path}.sidesAlpha`);
    }

    if (variant.coords !== undefined) {
        theme.coords = createRenderer(variant.coords, jsonRenderersRegistry.coords, `${path}.coords`);
    }

    if (variant.lastMove !== undefined) {
        theme.lastMove = createRenderer(variant.lastMove, jsonRenderersRegistry.lastMove, `${path}.lastMove`);
    }

    if (variant.swappable !== undefined) {
        theme.swappable = createRenderer(variant.swappable, jsonRenderersRegistry.swappable, `${path}.swappable`);
    }

    if (variant.swapped !== undefined) {
        theme.swapped = createRenderer(variant.swapped, jsonRenderersRegistry.swapped, `${path}.swapped`);
    }

    if (variant.anchor44 !== undefined) {
        theme.anchor44 = createAnchor44(variant.anchor44, `${path}.anchor44`);
    }

    if (variant.background !== undefined) {
        theme.background = createRenderer(variant.background, jsonRenderersRegistry.background, `${path}.background`);
    }

    return theme;
};

const createMetadata = (value: unknown): ThemeMetadata => {
    const metadata = expectObject(value, 'metadata');
    const required = ['id', 'name'];
    const optional = ['author', 'releaseDate', 'description'];

    for (const [key, value] of Object.entries(metadata)) {
        if (!required.includes(key) && !optional.includes(key)) {
            throw new JsonThemeError(`metadata.${key}`, `unknown key, expected one of: ${[...required, ...optional].join(', ')}`);
        }

        if (typeof value !== 'string') {
            throw new JsonThemeError(`metadata.${key}`, 'expected a string');
        }
    }

    for (const key of required) {
        if (typeof metadata[key] !== 'string' || metadata[key] === '') {
            throw new JsonThemeError(`metadata.${key}`, 'required');
        }
    }

    const { releaseDate } = metadata;

    if (typeof releaseDate === 'string' && (!isoDateRegex.test(releaseDate) || isNaN(Date.parse(releaseDate)))) {
        throw new JsonThemeError('metadata.releaseDate', 'expected an ISO 8601 date or datetime, i.e "2026-09-28" or "2026-09-28T14:00:00Z"');
    }

    return metadata as ThemeMetadata;
};

/**
 * Creates a theme from a json theme (see JsonTheme type).
 * Validates it and throws a JsonThemeError with the path of the invalid value.
 *
 * @param json Parsed json
 */
export const createThemeFromJson = (json: unknown): ThemeDefinition => {
    const root = expectObject(json, 'root');

    for (const key of Object.keys(root)) {
        if (!['metadata', 'theme', 'light', 'dark'].includes(key)) {
            throw new JsonThemeError(key, 'unknown key, expected one of: metadata, theme, light, dark');
        }
    }

    const metadata = createMetadata(root.metadata);
    const theme = expectObject(root.theme, 'theme');
    const light = root.light === undefined ? undefined : expectObject(root.light, 'light');
    const dark = root.dark === undefined ? undefined : expectObject(root.dark, 'dark');

    if (!light && !dark) {
        return {
            metadata,
            theme: createTheme(theme, 'theme'),
        };
    }

    /*
     * Theme may be incomplete, so both variants are created from theme merged with light or dark.
     * Theme alone is used for a mode that has no variant.
     */
    const lightVariant = light ? merge(theme, light) : theme;
    const darkVariant = dark ? merge(theme, dark) : theme;

    const definition: ThemeDefinition = {
        metadata,
        theme: createTheme(lightVariant, light ? 'theme+light' : 'theme'),
        dark: createTheme(darkVariant, dark ? 'theme+dark' : 'theme'),
    };

    expectSameKeys(lightVariant, darkVariant, '');

    return definition;
};
