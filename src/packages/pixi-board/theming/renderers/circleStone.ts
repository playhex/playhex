import { Graphics } from 'pixi.js';
import Hex from '../../Hex.js';
import { StoneRenderer } from '../types.js';

export type CircleStoneParams = {
    /**
     * Radius of the stone, relative to cell radius.
     */
    size?: number;

    /**
     * Stones colors, [player1, player2].
     * Defaults to theme player colors.
     */
    colors?: [number, number];

    /**
     * Outline color, i.e to make white stones visible on light board.
     * No outline if not set.
     */
    strokeColor?: number;

    /**
     * Outline width, relative to cell radius.
     */
    strokeWidth?: number;
};

/**
 * Round stone.
 */
export const circleStone = ({ size = 0.8, colors, strokeColor, strokeWidth = 0.05 }: CircleStoneParams = {}): StoneRenderer => ({
    orientation: 'free',
    draw: ({ playerIndex, colors: themeColors }) => {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * size);

        g.fill({
            color: colors
                ? colors[playerIndex]
                : [themeColors.player1, themeColors.player2][playerIndex]
            ,
        });

        if (strokeColor !== undefined) {
            g.stroke({ color: strokeColor, width: Hex.RADIUS * strokeWidth, alignment: 1 });
        }

        return g;
    },
});
