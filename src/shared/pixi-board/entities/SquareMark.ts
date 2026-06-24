import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

export default class SquareMark extends BoardEntity
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
        const s = Hex.RADIUS * 0.55;

        g.rect(-s, -s, s * 2, s * 2);
        g.stroke({
            color: this.color,
            width: Hex.RADIUS * 0.15,
        });

        return g;
    }
}
