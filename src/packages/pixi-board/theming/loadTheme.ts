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
 * Preload everything a theme needs before drawing (i.e images).
 * Never rejects: if an asset fails to load, theme is still applied,
 * and renderers draw without it (i.e board without its wood image).
 */
export const loadTheme = async (theme: BoardTheme): Promise<void> => {
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
        }
    }));
};
