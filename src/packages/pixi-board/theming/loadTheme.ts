import { BoardTheme } from './types.js';

/**
 * Whether theme has assets to preload (i.e images).
 */
export const themeNeedsLoading = (theme: BoardTheme): boolean => !!(
    theme.load
    || theme.background?.load
    || theme.board.load
    || theme.stone.load
);

/**
 * Preload everything a theme needs before drawing (i.e images).
 */
export const loadTheme = async (theme: BoardTheme): Promise<void> => {
    await Promise.all([
        theme.load?.(),
        theme.background?.load?.(),
        theme.board.load?.(),
        theme.stone.load?.(),
    ]);
};
