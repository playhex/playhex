import { Text, TextStyle } from 'pixi.js';
import Hex from '../../Hex.js';
import { CoordsRenderer } from '../types.js';

export type TextCoordsParams = {
    fontFamily?: string;

    /**
     * Font size, relative to cell radius.
     */
    fontSize?: number;

    fontWeight?: 'normal' | 'bold';
};

/**
 * Coords drawn as simple text.
 * Letters and numbers colors are theme `coordsLetters` and `coordsNumbers` colors, or `text` color.
 */
export const textCoords = ({ fontFamily = 'Arial', fontSize = 0.6, fontWeight = 'normal' }: TextCoordsParams = {}): CoordsRenderer => ({ label, axis, colors }) => {
    const color = (axis === 'letter' ? colors.coordsLetters : colors.coordsNumbers) ?? colors.text;

    return new Text({
        text: label,
        style: new TextStyle({
            fontFamily,
            fontSize: Hex.RADIUS * fontSize,
            fontWeight,
            fill: color,
        }),
        anchor: 0.5,
        resolution: window.devicePixelRatio * 2,
    });
};
