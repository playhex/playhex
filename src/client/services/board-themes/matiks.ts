import { Graphics } from 'pixi.js';
import { darken, Hex, hexBoard, hexStone, MarkRenderer, swapArrowsMark, ThemeDefinition } from '@playhex/pixi-board';

const stoneSize = 1 - Hex.PADDING;
const outlineWidth = 0.16;

/**
 * Outline inside the last played stone border.
 */
const outlineLastMove = (color: number): MarkRenderer => ({
    orientation: 'flatTop',
    draw: () => {
        const g = new Graphics();

        g.regularPoly(0, 0, Hex.RADIUS * (stoneSize - outlineWidth / 2), 6);
        g.stroke({ color, width: Hex.RADIUS * outlineWidth });
        g.rotation = Math.PI / 6;

        return g;
    },
});

/**
 * Hello Matiks theme.
 * Lime and pink stones on a very dark board, last move outlined in white.
 * Light mode: white board, deeper stone colors, dark last move outline.
 */
export const matiksTheme: ThemeDefinition = {
    metadata: {
        id: 'matiks',
        name: 'Hello Matiks',
        description: 'Lime and pink stones on a very dark board.',
        releaseDate: '2026-11-22',
    },

    theme: {
        colors: {
            player1: 0xb2fa63,
            player2: 0xe3498c,
            text: 0xdee2e6,
        },
        board: hexBoard({
            cellColor: 0x101010,
            strokeColor: 0x202020,
            shadingColor: darken(0x101010, 0.3),
            strokeWidth: 0.08,
            sidesWidth: 0.3,
        }),
        stones: hexStone({ size: stoneSize }),
        sidesAlpha: {
            highlighted: 1,
            faded: 0.25,
        },
        lastMove: outlineLastMove(0xffffff),
        swappable: swapArrowsMark({ color: 0x202020, alpha: 1 }),
    },

    light: {
        colors: {
            player1: 0x7cc423,
            player2: 0xd93a7c,
            text: 0x212529,
        },
        board: hexBoard({
            cellColor: 0xffffff,
            strokeColor: 0xced4da,
            shadingColor: darken(0xffffff, 0.1),
            strokeWidth: 0.08,
            sidesWidth: 0.3,
        }),
        lastMove: outlineLastMove(0x1b1b1b),
        swappable: swapArrowsMark({ color: 0xffffff, alpha: 1 }),
    },
};
