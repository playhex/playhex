import { colorBackground, swapArrowsMark, textMark } from '../../theming/index.js';
import { hexBoard } from '../../theming/renderers/hexBoard.js';
import { shapeMark } from '../../theming/renderers/shapeMark.js';
import { ThemeDefinition } from '../../theming/types.js';
import { hexworldStone } from '../../theming/renderers/hexworldStone.js';
import { darken } from '../../colorUtils.js';

const cellColor = 0xd9b479;
const strokeWidth = 0.05;

/**
 * HexWorld-like theme.
 * Wooden hexagon cells with black borders, black and white 3d stones,
 * sides inside a rounded frame.
 * In light mode, drawn on a grey-green background.
 * In dark mode, no background, and white coords.
 */
export const hexworldTheme: ThemeDefinition = {
    metadata: {
        id: 'hexworld',
        name: 'HexWorld',
        description: 'Inspired by HexWorld.org board style.',
        releaseDate: '2026-09-28',
    },

    theme: {
        colors: {
            player1: 0x000000,
            player2: 0xd7d0c9,
            text: 0x000000,
        },
        board: hexBoard({
            cellColor,
            strokeColor: 0x000000,
            shadingColor: 0x9e8358,
            strokeWidth,
            sidesColors: [0x000000, 0xf0ebe3],
            frame: true,
            frameMargin: 0.2,
            frameCornerRadius: 2,
            frameStrokeColor: 0x000000,
            frameStrokeWidth: 0.08,
        }),
        sidesAlpha: {
            highlighted: 1,
            faded: 1,
        },
        stones: hexworldStone(0.75),
        anchor44: {
            color: 0x000000,
            alpha: 0.3,
        },
        disabledCell: {
            // Darker than shading pattern, to not be confused with it
            color: darken(cellColor, 0.4),
            // Slightly over cell border, to not show a light outline due to antialiasing
            size: 1 - strokeWidth + 0.01,
        },
        lastMove: shapeMark({
            shape: 'circle',
            colors: [0xa0a0a0, 0x707070],
            size: 0.1,
        }),
        swappable: swapArrowsMark({
            size: 0.9,
        }),
        swapped: textMark({
            text: 'S',
            colors: [0xffffff, 0x000000],
        }),
    },

    dark: {
        colors: {
            text: 0xffffff,
        },
    },

    light: {
        background: colorBackground({ color: 0xd0d0c0 }),
    },
};
