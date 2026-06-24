import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

export default class SelectMark extends BoardEntity
{
    constructor(
        private color: number = 0xffc107,
    ) {
        super();
    }

    protected override draw(): Container
    {
        const g = new Graphics();

        g.regularPoly(0, 0, Hex.INNER_RADIUS, 6);
        g.fill({
            color: this.color,
            alpha: 0.3,
        });

        return g;
    }
}
