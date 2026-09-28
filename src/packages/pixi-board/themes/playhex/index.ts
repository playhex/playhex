import { darken } from '../../colorUtils.js';
import { hexBoard } from '../../theming/renderers/hexBoard.js';
import { hexStone } from '../../theming/renderers/hexStone.js';
import { ThemeDefinition } from '../../theming/types.js';

const colorEmptyDark = 0x343a40; // --bs-light-bg-subtle
const colorEmptyLight = 0xfcfcfd;

/**
 * Default PlayHex theme.
 * Hexagon cells and stones, red and blue players.
 * Dark by default, light mode only changes colors.
 */
export const playhexTheme: ThemeDefinition = {
    metadata: {
        id: 'playhex',
        name: 'PlayHex (original)',
        description: 'The original PlayHex style.',
        author: 'PlayHex',
        releaseDate: '2023-01-01',
    },

    theme: {
        colors: {
            player1: 0xdc3545, // --bs-danger
            player2: 0x0d6efd, // --bs-primary
            text: 0xdee2e6, // --bs-body-color
        },
        board: hexBoard({
            cellColor: colorEmptyDark,
            strokeColor: 0x1a1d20, // --bs-dark-bg-subtle
            shadingColor: darken(colorEmptyDark, 0.40),
        }),
        stones: hexStone(),
    },

    light: {
        colors: {
            text: 0x212529,
        },
        board: hexBoard({
            cellColor: colorEmptyLight,
            strokeColor: 0xced4da,
            shadingColor: darken(colorEmptyLight, 0.22),
        }),
    },
};
