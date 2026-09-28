import { Graphics } from 'pixi.js';
import Hex from '../../Hex.js';
import { MarkRenderer } from '../types.js';

export type ShapeMarkParams = {
    shape: 'hexagon' | 'circle' | 'square';

    /**
     * Mark color. Defaults to theme text color.
     */
    color?: number;

    /**
     * Mark color depending on the stone below: [on player1 stone, on player2 stone].
     * Takes precedence over `color` when there is a stone below.
     */
    colors?: [number, number];

    /**
     * Opacity, between 0 and 1.
     */
    alpha?: number;

    /**
     * Radius (or half side for square), relative to cell radius.
     */
    size?: number;
};

/**
 * Mark with a simple shape: flat-top hexagon, circle, or upright square.
 */
export const shapeMark = ({ shape, color, colors, alpha = 1, size = 0.3 }: ShapeMarkParams): MarkRenderer => ({
    orientation: {
        hexagon: 'flatTop' as const,
        circle: 'free' as const,
        square: 'upright' as const,
    }[shape],
    draw: ({ playerIndex, colors: themeColors }) => {
        const g = new Graphics();
        const radius = Hex.RADIUS * size;

        switch (shape) {
            case 'hexagon':
                g.regularPoly(0, 0, radius, 6);
                g.rotation = Math.PI / 6;
                break;

            case 'circle':
                g.circle(0, 0, radius);
                break;

            case 'square':
                g.rect(-radius, -radius, radius * 2, radius * 2);
                break;
        }

        g.fill({
            color: (colors && playerIndex !== null ? colors[playerIndex] : color) ?? themeColors.text,
            alpha,
        });

        return g;
    },
});
