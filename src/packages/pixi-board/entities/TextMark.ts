import { Container, Text, TextStyle } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

/**
 * Show a text, generally a letter, on given coordinates.
 */
export default class TextMark extends BoardEntity
{
    /**
     * Color of text.
     * If not set, will use board theme color (light text on dark, or dark text on light)
     */
    private color: null | number = null;

    /**
     * Size of text in coefficient.
     * 1 means normal, fine to display a single letter in full hex cell,
     * 0.5 means half size.
     */
    private sizeCoef = 1;

    constructor(
        private text: string = 'A',
    ) {
        super();

        this.alwaysTop = true;
        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const style = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * this.sizeCoef,
            fill: this.color ?? this.theme.textColor,
        });

        const text = new Text({
            text: this.text,
            style,
            anchor: 0.5,
            resolution: window.devicePixelRatio * 2,
        });

        return text;
    }

    setColor(color: null | number): this
    {
        this.color = color;

        return this;
    }

    setSizeCoef(sizeCoef: number): this
    {
        this.sizeCoef = sizeCoef;

        return this;
    }
}
