import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

/**
 * Board edges: top and bottom are red edges, left and right are blue edges.
 */
export type BoardEdge = 'top' | 'bottom' | 'left' | 'right';

/**
 * Direction perpendicular to each edge, in board coords.
 */
const edgeDirections: { [edge in BoardEdge]: { row: number, col: number } } = {
    top: { row: -1, col: 0.5 },
    bottom: { row: 1, col: -0.5 },
    left: { row: 0.5, col: -1 },
    right: { row: -0.5, col: 1 },
};

/**
 * Arrow pointing towards an edge of the board,
 * e.g to show a stone is connected to it. Rotates with the board.
 */
export default class EdgeArrowMark extends BoardEntity
{
    constructor(
        private edge: BoardEdge,
        private color: number = 0xffffff,
    ) {
        super();
    }

    protected override draw(): Container
    {
        const { row, col } = edgeDirections[this.edge];
        const { x, y } = Hex.coords(row, col);
        const g = new Graphics();

        // Arrow points to a cell corner: head arms parallel to cell sides,
        // same thickness as shaft, like a stroke with sharp corners
        const tip = Hex.RADIUS * 0.55;
        const tail = -tip;
        const arm = Hex.RADIUS * 0.45;
        const thickness = Hex.RADIUS * 0.16;
        const armX = -arm / 2;
        const armY = arm * Math.sqrt(3) / 2;
        const half = thickness / 2;
        const armThickness = thickness / (Math.sqrt(3) / 2); // along arrow, gives same thickness across arms
        const innerTip = tip - armThickness - half / Math.sqrt(3);

        g.poly([
            tip, 0,
            tip + armX, -armY,
            tip + armX - armThickness, -armY,
            innerTip, -half,
            tail, -half,
            tail, half,
            innerTip, half,
            tip + armX - armThickness, armY,
            tip + armX, armY,
        ]);

        g.fill({ color: this.color });

        g.rotation = Math.atan2(y, x);

        return g;
    }
}
