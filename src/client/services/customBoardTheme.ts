import { createThemeFromJson, getBuiltinTheme, ThemeDefinition } from '@playhex/pixi-board';

/**
 * Value of player settings boardTheme to use player json theme (customBoardTheme).
 */
export const CUSTOM_BOARD_THEME_ID = 'custom';

export const THEMING_DOC_URL = 'https://github.com/playhex/playhex/tree/master/src/packages/pixi-board/THEMING.md';

/**
 * Json prefilled in textarea when player has no custom theme yet.
 */
export const customBoardThemeTemplate = JSON.stringify({
    metadata: {
        id: 'my-theme',
        name: 'My theme',
    },
    theme: {
        colors: { player1: '#dc3545', player2: '#0d6efd', text: '#dee2e6' },
        board: { type: 'hex', cellColor: '#343a40', strokeColor: '#1a1d20' },
        stones: { type: 'hex' },
    },
    light: {
        colors: { text: '#212529' },
        board: { cellColor: '#fcfcfd', strokeColor: '#ced4da' },
    },
}, null, 4);

/**
 * Last parsed json, so same json returns same theme instance,
 * and is not parsed again each time a player setting changes.
 */
let cache: null | { json: string, result: ThemeDefinition | Error } = null;

/**
 * Parses and validates a json theme.
 * Returns an Error with a message like "theme.board.cellColor: invalid color" if invalid.
 */
export const parseCustomBoardTheme = (json: string): ThemeDefinition | Error => {
    if (cache?.json === json) {
        return cache.result;
    }

    let result: ThemeDefinition | Error;

    try {
        result = createThemeFromJson(JSON.parse(json));
    } catch (e) {
        result = e instanceof Error ? e : new Error(String(e));
    }

    cache = { json, result };

    return result;
};

/**
 * Theme to display from player settings.
 * Falls back to default theme if custom theme is missing or invalid.
 */
export const getPlayerBoardTheme = (boardTheme: undefined | null | string, customBoardTheme: undefined | null | string): ThemeDefinition => {
    if (boardTheme === CUSTOM_BOARD_THEME_ID && customBoardTheme) {
        const result = parseCustomBoardTheme(customBoardTheme);

        if (!(result instanceof Error)) {
            return result;
        }
    }

    return getBuiltinTheme(boardTheme);
};
