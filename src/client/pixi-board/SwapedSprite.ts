import { Container, Graphics, Text, TextStyle } from 'pixi.js';
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
        const g = new Graphics();

        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 1.4,
            fontWeight: 'bold',
            fill: 0xffffff,
        });

        const S = new Text('S', coordsTextStyle);

        S.anchor.set(0.5, 0.5);

        g.alpha = 0.4;

        g.addChild(S);
        this.addChild(g);
    }
}
