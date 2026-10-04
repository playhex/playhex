import { BoardTheme, ThemeDefinition, ThemeMode } from './types.js';

/**
 * Get theme to use in light or dark mode,
 * with light or dark overrides applied if any.
 */
export const resolveTheme = (definition: ThemeDefinition, mode: ThemeMode): BoardTheme => {
    const override = definition[mode];

    if (!override) {
        return definition.theme;
    }

    return {
        ...definition.theme,
        ...override,
        colors: {
            ...definition.theme.colors,
            ...override.colors,
        },
        anchor44: {
            ...definition.theme.anchor44,
            ...override.anchor44,
        },
        disabledCell: {
            ...definition.theme.disabledCell,
            ...override.disabledCell,
        },
        sidesAlpha: {
            ...definition.theme.sidesAlpha,
            ...override.sidesAlpha,
        },
    };
};
