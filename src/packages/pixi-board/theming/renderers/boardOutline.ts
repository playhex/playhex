import { PointData } from 'pixi.js';
import Hex from '../../Hex.js';

const { sqrt } = Math;
const SQRT_3_2 = sqrt(3) / 2;

/**
 * Outward normals of board edges.
 * Player 1 connects top to bottom, player 2 connects left to right.
 */
const normals = {
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
    left: { x: -SQRT_3_2, y: 0.5 },
    right: { x: SQRT_3_2, y: -0.5 },
};

type Normal = typeof normals.top;

export type OffsetCorner = {
    /**
     * Point at distance `dist` from edge before corner
     */
    a: PointData;

    /**
     * Point at distance `dist` from edge after corner
     */
    b: PointData;

    /**
     * Point on corner bisector, to split sides
     */
    mid: PointData;
};

/**
 * Corner of a polygon parallel to board edges, at distance `dist` outside the board.
 *
 * Obtuse corners are mitered (a, b and mid are the same point).
 * Acute corners are beveled at `dist` from corner, else miter would go far away from the board (twice the distance).
 *
 * @param a Normal of the edge before corner, clockwise
 * @param b Normal of the edge after corner, clockwise
 */
const offsetCorner = (corner: PointData, a: Normal, b: Normal, dist: number): OffsetCorner => {
    const dot = a.x * b.x + a.y * b.y;

    if (dot < 0) {
        // Bevel perpendicular to bisector, at distance `dist` from corner.
        // Points are `corner + x * a + y * b`, at distance `dist` from edge a (or b) and from corner along bisector.
        const bisectorLength = sqrt(2 + 2 * dot);
        const near = dist * (bisectorLength / (1 + dot) - 1) / (1 - dot);
        const far = dist - near * dot;
        const point = (x: number, y: number): PointData => ({
            x: corner.x + a.x * x + b.x * y,
            y: corner.y + a.y * x + b.y * y,
        });

        return {
            a: point(far, near),
            b: point(near, far),
            mid: point(dist / bisectorLength, dist / bisectorLength),
        };
    }

    const coef = dist / (1 + dot);
    const miter = {
        x: corner.x + (a.x + b.x) * coef,
        y: corner.y + (a.y + b.y) * coef,
    };

    return { a: miter, b: miter, mid: miter };
};

/**
 * Board outline corners, parallel to lines between cells centers,
 * at distance `dist` outside, clockwise:
 * [top-left, top-right, bottom-right, bottom-left]
 *
 * Edges between corners, clockwise, are: top, right, bottom, left.
 */
export const boardOutline = (boardsize: number, dist: number): OffsetCorner[] => {
    const last = boardsize - 1;

    return [
        offsetCorner(Hex.coords(0, 0), normals.left, normals.top, dist),
        offsetCorner(Hex.coords(0, last), normals.top, normals.right, dist),
        offsetCorner(Hex.coords(last, last), normals.right, normals.bottom, dist),
        offsetCorner(Hex.coords(last, 0), normals.bottom, normals.left, dist),
    ];
};

/**
 * Outline as a polygon, without duplicate points on mitered corners.
 */
export const boardOutlinePolygon = (outline: OffsetCorner[]): PointData[] => outline.flatMap(corner => corner.a === corner.b
    ? [corner.a]
    : [corner.a, corner.b],
);
