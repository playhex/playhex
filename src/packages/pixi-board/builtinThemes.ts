import { ThemeDefinition } from './theming/types.js';
import { playhexTheme } from './themes/playhex/index.js';
import { gobanTheme } from './themes/goban/index.js';
import { hexworldTheme } from './themes/hexworld/index.js';
import { polishNostalgiaTheme } from './themes/polish-nostalgia/index.js';

/**
 * Themes provided by this package, indexed by their id.
 */
export const builtinThemes: { [id: string]: ThemeDefinition } = Object.fromEntries(
    [
        playhexTheme,
        gobanTheme,
        hexworldTheme,
        polishNostalgiaTheme,
    ].map(theme => [theme.metadata.id, theme]),
);

/**
 * Get a builtin theme by its id,
 * or default PlayHex theme if not found.
 */
export const getBuiltinTheme = (id: null | undefined | string): ThemeDefinition => {
    return (id ? builtinThemes[id] : undefined) ?? playhexTheme;
};
