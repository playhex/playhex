import { Container, Graphics } from 'pixi.js';
import { Mark } from '../Mark.js';
import Hex from '../Hex.js';

export default class HexagonMark extends Mark
{
    constructor(
        private color: number = 0xffffff,
        private radius: number = 1,
    ) {
        super();
    }

    protected override draw(): Container
    {
        const g = new Graphics();
        g.regularPoly(0, 0, Hex.RADIUS * this.radius, 6);
        g.fill({
            color: this.color,
        });

        return g;
    }
}
