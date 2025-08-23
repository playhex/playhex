import { Container, Graphics } from 'pixi.js';
import { Mark } from '../Mark.js';
import Hex from '../Hex.js';

export default class TriangleMark extends Mark
{
    constructor(
        private color: number = 0xffffff,
    ) {
        super();

        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();
        g.regularPoly(0, 0, Hex.RADIUS * 0.55, 3);
        g.stroke({
            color: this.color,
            width: Hex.RADIUS * 0.15,
        });

        return g;
    }
}
