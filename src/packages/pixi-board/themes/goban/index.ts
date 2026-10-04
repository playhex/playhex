import { goBoard } from '../../theming/renderers/goBoard.js';
import { ThemeDefinition } from '../../theming/types.js';
import { hexworldStone } from '../../theming/renderers/hexworldStone.js';
import { shapeMark, swapArrowsMark, textMark } from '../../theming/index.js';
import { darken } from '../../colorUtils.js';

const lineColor = 0x3d2b12;
const boardColor = 0xe2c9a8;

// Resolved and emitted as an asset by bundlers (vite, webpack)
const oakWoodUrl = new URL('./oak-wood.jpg', import.meta.url).href;

/**
 * Go-like theme.
 * Oak wood board, stones are played on lines intersections,
 * black and white round stones.
 * Board is the same in light and dark mode, only coords color changes.
 */
export const gobanTheme: ThemeDefinition = {
    metadata: {
        id: 'goban',
        name: 'Goban',
        description: 'A Go-style Hex board, where stones are placed on the intersections, just like in Go.',
        author: 'PlayHex',
        releaseDate: '2026-09-28',
    },

    theme: {
        colors: {
            player1: 0x1a1a1a,
            player2: 0xf5f5f5,
            text: 0xdee2e6,
        },
        board: goBoard({
            boardColor,
            boardImage: oakWoodUrl,
            lineColor,
            shadingColor: 0x8a6a2e,
        }),
        stones: hexworldStone(0.75),
        anchor44: {
            color: lineColor,
            alpha: 1,
            size: 0.15,
        },
        // No grid between cells, so disabled cells make a single flat zone
        disabledCell: {
            color: darken(boardColor, 0.3),
            size: 1,
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

    light: {
        colors: {
            text: 0x212529,
        },
    },
};
