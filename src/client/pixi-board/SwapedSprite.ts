import { Container, Text, TextStyle } from 'pixi.js';
import Hex from './Hex';

export default class SwapedSprite extends Container
{
    constructor()
    {
        super();

        this.draw();
    }

    private draw(): void
    {
        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 1.4,
            fontWeight: 'bold',
            fill: 0xffffff,
        });

        const S = new Text({ text: 'S', style: coordsTextStyle });

        S.anchor.set(0.5, 0.5);
        S.alpha = 0.4;

        this.addChild(S);
    }
}
