import { builtinThemes, playhexTheme, ThemeDefinition } from '@playhex/pixi-board';
import { matiksTheme } from './matiks.js';

/**
 * Themes selectable on PlayHex: pixi-board builtin themes, plus PlayHex only themes.
 */
export const boardThemes: { [id: string]: ThemeDefinition } = {
    ...builtinThemes,
    [matiksTheme.metadata.id]: matiksTheme,
};

/**
 * Get a theme by its id, or default PlayHex theme if not found.
 */
export const getBoardTheme = (id: null | undefined | string): ThemeDefinition => {
    return (id ? boardThemes[id] : undefined) ?? playhexTheme;
};
