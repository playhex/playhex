import type { BoardTheme } from '@playhex/pixi-board';

/**
 * Halloween theme is displayed from the eve, October 30th at 16:00,
 * until November 1st at 04:00, in player local time.
 *
 * Can be previewed any other day by adding "#halloween" to the url.
 */
export const isHalloween = (date: Date = new Date()): boolean => {
    if (window.location.hash === '#halloween') {
        return true;
    }

    const year = date.getFullYear();

    return date >= new Date(year, 9, 30, 16) && date < new Date(year, 10, 1, 4);
};

/**
 * Evaluated once on page load,
 * so theme does not suddenly change at midnight while playing.
 */
export const halloween = isHalloween();

/**
 * Default red and blue stones become orange and purple,
 * same saturation and lightness, like bootstrap colors in halloween.css.
 * Themes with other stones colors are kept as is.
 */
const halloweenStoneColors: { [color: number]: number } = {
    0xdc3545: 0xfd790d,
    0x0d6efd: 0x850dfd,
};

/**
 * Halloween sounds replacing default ones.
 * Same laugh on victory and defeat.
 */
const halloweenSounds: { [filename: string]: string } = {
    '/sounds/lisp/Move.ogg': '/sounds/halloween/Move.ogg',
    '/sounds/lisp/Victory.ogg': '/sounds/halloween/Victory.ogg',
    '/sounds/lisp/Defeat.ogg': '/sounds/halloween/Victory.ogg',
};

export const halloweenSound = (filename: string): string => {
    if (!halloween) {
        return filename;
    }

    return halloweenSounds[filename] ?? filename;
};

export const halloweenBoardTheme = (theme: BoardTheme): BoardTheme => {
    if (!halloween) {
        return theme;
    }

    const { player1, player2 } = theme.colors;

    return {
        ...theme,
        colors: {
            ...theme.colors,
            player1: halloweenStoneColors[player1] ?? player1,
            player2: halloweenStoneColors[player2] ?? player2,
        },
    };
};
