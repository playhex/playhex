import { ColorSource, Container, Graphics } from 'pixi.js';
import { Mark } from '../Mark.js';
import Hex from '../Hex.js';

/**
 * Show a little white hexagon on a stone to show last move.
 * Should not be used on an empty cell because won't be visible on light theme.
 */
export default class Anchor44Mark extends Mark
{
    constructor(
        private color: ColorSource,
    ) {
        super();
    }

    protected override draw(): Container
    {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.2);
        g.fill({ color: this.color, alpha: 0.2 });

        return g;
    }
}
