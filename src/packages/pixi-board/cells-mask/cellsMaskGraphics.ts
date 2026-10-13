import { Graphics, PointData } from 'pixi.js';
import Hex from '../Hex.js';
import { Normal, normals } from '../theming/renderers/boardOutline.js';
import { CellsMask } from './CellsMask.js';

const { sqrt } = Math;

/**
 * How far outside the board edge cells are extruded, relative to cell radius.
 * Must cover everything a board renderer can draw outside cells: sides, frame, padding...
 */
const EXTRUSION_LENGTH = 3;

/**
 * Half distance between two adjacent cells centers.
 */
const HALF_CELL_SPACING = Hex.RADIUS * sqrt(3) / 2;

const add = (a: PointData, b: PointData, k = 1): PointData => ({
    x: a.x + b.x * k,
    y: a.y + b.y * k,
});

/**
 * Board edges normals a cell touches.
 * 0 for inner cells, 1 for edge cells, 2 for corner cells.
 */
const outwardNormals = (row: number, col: number, boardsize: number): Normal[] => {
    const last = boardsize - 1;
    const edges: [boolean, Normal][] = [
        [row === 0, normals.top],
        [col === last, normals.right],
        [row === last, normals.bottom],
        [col === 0, normals.left],
    ];

    return edges
        .filter(([isOnEdge]) => isOnEdge)
        .map(([, normal]) => normal)
    ;
};

/**
 * Polygons covering the area of a cell:
 * - its hexagon,
 * - for edge cells, the slice of what is drawn outside the board in front of this cell (sides, frame...).
 *   Slices of adjacent edge cells are touching without overlapping,
 *   so sides of an hidden cell are not drawn, but sides of its adjacent visible cell are.
 * - for corner cells, the area between both slices.
 */
export const cellPolygons = (row: number, col: number, boardsize: number): PointData[][] => {
    const center = Hex.coords(row, col);
    const length = Hex.RADIUS * EXTRUSION_LENGTH;
    const hexagon: PointData[] = [];

    for (let i = 0; i < 6; ++i) {
        hexagon.push(add(center, Hex.cornerCoords(i)));
    }

    const polygons = [hexagon];
    const cellNormals = outwardNormals(row, col, boardsize);

    for (const normal of cellNormals) {
        // Tangent to the board edge
        const tangent = { x: -normal.y, y: normal.x };
        const a = add(center, tangent, HALF_CELL_SPACING);
        const b = add(center, tangent, -HALF_CELL_SPACING);

        polygons.push([a, b, add(b, normal, length), add(a, normal, length)]);
    }

    if (cellNormals.length === 2) {
        const [n0, n1] = cellNormals;

        polygons.push([
            center,
            add(center, n0, length),
            add(add(center, n0, length), n1, length),
            add(center, n1, length),
        ]);
    }

    return polygons;
};

/**
 * Graphics covering all visible cells,
 * to be used as a mask on board, stones and marks.
 *
 * Not an inverse mask covering hidden cells:
 * pixi does not restore inverse mask after a nested mask (i.e goban board image mask).
 *
 * @returns null if no cell is hidden, no mask needed
 */
export const createCellsMaskGraphics = (cellsMask: CellsMask): null | Graphics => {
    if (!cellsMask.hasHiddenCells()) {
        return null;
    }

    const g = new Graphics();
    const boardsize = cellsMask.getBoardsize();

    for (const { row, col } of cellsMask.getVisibleCoords()) {
        for (const polygon of cellPolygons(row, col, boardsize)) {
            g.poly(polygon);
            g.fill({ color: 0xffffff });
        }
    }

    return g;
};
