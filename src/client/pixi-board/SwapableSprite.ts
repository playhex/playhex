import { Container, Graphics } from 'pixi.js';
import Hex from './Hex';

export default class SwapableSprite extends Container
{
    constructor()
    {
        super();

        this.draw();
    }

    private draw(): void
    {
        const g = new Graphics();
        const outside = Hex.RADIUS * (1 - 6 * Hex.PADDING);
        const inside = Hex.RADIUS * (1 - 10 * Hex.PADDING);
        const outsideArrow = Hex.RADIUS * (1 - 4 * Hex.PADDING);
        const insideArrow = Hex.RADIUS * (1 - 12.5 * Hex.PADDING);

        g.lineStyle(0);
        g.beginFill(0xffffff, 0.4);

        const drawArrow = (offset: number) => g.drawPolygon([
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

        drawArrow(1.5);
        drawArrow(4.5);

        this.addChild(g);
    }
}
