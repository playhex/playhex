import { Text, TextStyle } from 'pixi.js';
import Hex from '../../Hex.js';
import { MarkRenderer } from '../types.js';

export type TextMarkParams = {
    /**
     * Text to display, generally a single letter, i.e "S"
     */
    text: string;

    /**
     * Text color. Defaults to white.
     */
    color?: number;

    /**
     * Text color depending on the stone below: [on player1 stone, on player2 stone].
     * Takes precedence over `color` when there is a stone below.
     */
    colors?: [number, number];

    /**
     * Opacity, between 0 and 1. Defaults to 0.4.
     */
    alpha?: number;

    /**
     * Font size, relative to cell radius. Defaults to 1.4.
     */
    size?: number;

    fontFamily?: string;

    /**
     * Defaults to bold.
     */
    fontWeight?: 'normal' | 'bold';
};

/**
 * Mark with a text, always upright, i.e "S" on swapped stone.
 */
export const textMark = ({
    text,
    color = 0xffffff,
    colors,
    alpha = 0.4,
    size = 1.4,
    fontFamily = 'Arial',
    fontWeight = 'bold',
}: TextMarkParams): MarkRenderer => ({
    orientation: 'upright',
    draw: ({ playerIndex }) => {
        const mark = new Text({
            text,
            style: new TextStyle({
                fontFamily,
                fontSize: Hex.RADIUS * size,
                fontWeight,
                fill: colors && playerIndex !== null ? colors[playerIndex] : color,
            }),
            anchor: 0.5,
        });

        mark.alpha = alpha;

        return mark;
    },
});
