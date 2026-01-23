import { Container, Graphics, PointData } from 'pixi.js';
import { Mark } from '../Mark.js';
import Hex from '../Hex.js';

/**
 * Show a little white hexagon on a stone to show last move.
 * Should not be used on an empty cell because won't be visible on light theme.
 */
export default class LastMoveMark extends Mark
{
    constructor()
    {
        super();

        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * 0.3));
        }

        g.poly(path);
        g.fill({ color: 0xffffff, alpha: 0.4 });

        g.visible = false;

        return g;
    }
}
