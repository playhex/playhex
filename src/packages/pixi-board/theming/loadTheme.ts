import { BoardTheme } from './types.js';

/**
 * Max time to wait for theme assets, in milliseconds.
 * Some devices never resolve or reject image loading,
 * which would prevent board from being displayed.
 */
export const LOAD_THEME_TIMEOUT = 5000;

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
 * Preload everything a theme needs before drawing (i.e images).
 * Never rejects: if an asset fails to load, or is too long to load, theme is still applied,
 * and renderers draw without it (i.e board without its wood image).
 * An asset still loading after timeout is considered in error,
 * its loading is not cancelled but its result is ignored.
 *
 * @returns Errors that happened while loading assets, empty if everything loaded.
 */
export const loadTheme = async (theme: BoardTheme, timeout = LOAD_THEME_TIMEOUT): Promise<Error[]> => {
    const errors: Error[] = [];
    const loaders = [
        theme.load,
        theme.background?.load,
        theme.board.load,
        theme.stones.load,
    ];

    let timeoutId: undefined | ReturnType<typeof setTimeout>;

    const timeoutReached = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Theme asset still not loaded after ${timeout}ms`)), timeout);
    });

    await Promise.all(loaders.map(async load => {
        if (!load) {
            return;
        }

        try {
            await Promise.race([load(), timeoutReached]);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Could not load theme asset, theme is applied without it', e);
            errors.push(e instanceof Error ? e : new Error(String(e)));
        }
    }));

    clearTimeout(timeoutId);

    return errors;
};
