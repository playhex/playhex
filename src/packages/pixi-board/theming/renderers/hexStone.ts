import { Graphics } from 'pixi.js';
import Hex from '../../Hex.js';
import { StoneRenderer } from '../types.js';

export type HexStoneParams = {
    /**
     * Radius of the stone, relative to cell radius.
     * 1 means the stone covers the whole cell, lines between cells included.
     */
    size?: number;

    /**
     * Stones colors, [player1, player2].
     * Defaults to theme player colors.
     */
    colors?: [number, number];
};

/**
 * Hexagon stone, filling the cell.
 */
export const hexStone = ({ size = 1 - Hex.PADDING, colors }: HexStoneParams = {}): StoneRenderer => ({
    orientation: 'flatTop',
    draw: ({ playerIndex, colors: themeColors }) => {
        const g = new Graphics();

        g.regularPoly(0, 0, Hex.RADIUS * size, 6);

        g.fill({
            color: colors
                ? colors[playerIndex]
                : [themeColors.player1, themeColors.player2][playerIndex]
            ,
        });

        g.rotation = Math.PI / 6;

        return g;
    },
});
