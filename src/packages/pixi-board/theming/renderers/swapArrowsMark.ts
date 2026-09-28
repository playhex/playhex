import { Graphics } from 'pixi.js';
import Hex from '../../Hex.js';
import { MarkRenderer } from '../types.js';

export type SwapArrowsMarkParams = {
    /**
     * Mark color. Defaults to white.
     */
    color?: number;

    /**
     * Mark color depending on the stone below: [on player1 stone, on player2 stone].
     * Takes precedence over `color` when there is a stone below.
     */
    colors?: [number, number];

    /**
     * Opacity, between 0 and 1. Defaults to 0.4.
     */
    alpha?: number;

    /**
     * Scale of the arrows, 1 is the default size, around the stone.
     */
    size?: number;
};

/**
 * Two circular arrows, shows that first stone can be swapped.
 */
export const swapArrowsMark = ({ color = 0xffffff, colors, alpha = 0.4, size = 1 }: SwapArrowsMarkParams = {}): MarkRenderer => ({
    orientation: 'flatTop',
    draw: ({ playerIndex }) => {
        const g = new Graphics();
        const outside = Hex.RADIUS * size * (1 - 6 * Hex.PADDING);
        const inside = Hex.RADIUS * size * (1 - 10 * Hex.PADDING);
        const outsideArrow = Hex.RADIUS * size * (1 - 4 * Hex.PADDING);
        const insideArrow = Hex.RADIUS * size * (1 - 12.5 * Hex.PADDING);

        const drawArrow = (offset: number) => g.poly([
            Hex.cornerCoords(offset - 0, inside),
            Hex.cornerCoords(offset - 1, inside),
            Hex.cornerCoords(offset - 2, inside),
            Hex.cornerCoords(offset - 2, outside),
            Hex.cornerCoords(offset - 1, outside),
            Hex.cornerCoords(offset - 0, outside),

            Hex.cornerCoords(offset - 0, outsideArrow),
            Hex.cornerCoords(offset - -Math.SQRT1_2, outside),
            Hex.cornerCoords(offset - 0, insideArrow),
        ]);

        drawArrow(2.5);
        drawArrow(5.5);

        g.fill({
            color: colors && playerIndex !== null ? colors[playerIndex] : color,
            alpha,
        });

        return g;
    },
});
