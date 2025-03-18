import { Container, Text, TextStyle } from 'pixi.js';
import { Mark } from '../Mark.js';
import Hex from '../Hex.js';

/**
 * Show a text, generally a letter, on given coordinates.
 */
export default class TextMark extends Mark
{
    constructor(
        private text: string = 'A',
    ) {
        super();

        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS,
            fill: 0xffffff,
        });

        const text = new Text({
            text: this.text,
            style,
            anchor: 0.5,
            resolution: window.devicePixelRatio * 2,
        });

        return text;
    }
}
