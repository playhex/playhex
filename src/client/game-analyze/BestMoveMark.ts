import { Graphics, PointData } from 'pixi.js';
import { Mark } from '../../shared/pixi-board/Mark';
import Hex from '../../shared/pixi-board/Hex';

/**
 * Computer best move.
 * Note that it can be either over empty cell, or a played cell.
 */
export class BestMoveMark extends Mark
{
    override draw(): void
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS * 0.6));
        }

        g.poly(path);
        g.stroke({ color: '0x00ff00', width: Hex.INNER_RADIUS * 0.2 });

        this.addChild(g);
    }
}
