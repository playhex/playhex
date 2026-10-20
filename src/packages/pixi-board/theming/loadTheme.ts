import { BoardTheme } from './types.js';

/**
 * Whether theme has assets to preload (i.e images).
 */
export const themeNeedsLoading = (theme: BoardTheme): boolean => !!(
    theme.load
    || theme.background?.load
    || theme.board.load
    || theme.stones.load
);

/**
 * Load everything a theme draws (i.e images).
 * Never rejects: if an asset fails to load, renderers draw without it (i.e board without its wood image).
 *
 * @returns Errors that happened while loading assets, empty if everything loaded.
 */
export const loadTheme = async (theme: BoardTheme): Promise<Error[]> => {
    const errors: Error[] = [];
    const loaders = [
        theme.load,
        theme.background?.load,
        theme.board.load,
        theme.stones.load,
    ];

    await Promise.all(loaders.map(async load => {
        try {
            await load?.();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not load theme asset, theme is applied without it', e);
            errors.push(e instanceof Error ? e : new Error(String(e)));
        }
    }));

    return errors;
};
