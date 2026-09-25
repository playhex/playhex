import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

/**
 * Show a little white hexagon on a stone to show last move.
 * Should not be used on an empty cell because won't be visible on light theme.
 */
export default class Anchor44Mark extends BoardEntity
{
    constructor()
    {
        super();

        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.2);
        g.fill({ color: this.theme.textColor, alpha: 0.2 });

        return g;
    }
}
