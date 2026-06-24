import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

export default class CrossMark extends BoardEntity
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
        const r = Hex.RADIUS * 0.5;

        g.moveTo(-r, -r).lineTo(r, r);
        g.moveTo(-r, r).lineTo(r, -r);
        g.stroke({
            color: this.color,
            width: Hex.RADIUS * 0.15,
        });

        return g;
    }
}
