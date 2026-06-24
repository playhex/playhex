import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

export default class CircleMark extends BoardEntity
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

        g.circle(0, 0, Hex.RADIUS * 0.55);
        g.stroke({
            color: this.color,
            width: Hex.RADIUS * 0.15,
        });

        return g;
    }
}
