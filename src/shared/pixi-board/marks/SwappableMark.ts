import { Container, Graphics } from 'pixi.js';
import { Mark } from '../Mark';
import Hex from '../Hex';

/**
 * Shows that first stone can be swapped if applicable.
 */
export default class SwappableMark extends Mark
{
    constructor()
    {
        super();

        this.alwaysFlatTop = true;
        this.alwaysTop = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();
        const outside = Hex.RADIUS * (1 - 6 * Hex.PADDING);
        const inside = Hex.RADIUS * (1 - 10 * Hex.PADDING);
        const outsideArrow = Hex.RADIUS * (1 - 4 * Hex.PADDING);
        const insideArrow = Hex.RADIUS * (1 - 12.5 * Hex.PADDING);

        const drawArrow = (offset: number) => g.poly([
            Hex.cornerCoords(offset - 0, inside),
            Hex.cornerCoords(offset - 1, inside),
            Hex.cornerCoords(offset - 2, inside),
            Hex.cornerCoords(offset - 2, outside),
            Hex.cornerCoords(offset - 1, outside),
            Hex.cornerCoords(offset - 0, outside),

            Hex.cornerCoords(offset - 0, outsideArrow),
            Hex.cornerCoords(offset - -Math.SQRT1_2, outside),
            Hex.cornerCoords(offset - 0, insideArrow),
        ]);

        drawArrow(2.5);
        drawArrow(5.5);
        g.fill({ color: 0xffffff, alpha: 0.4 });

        return g;
    }
}
