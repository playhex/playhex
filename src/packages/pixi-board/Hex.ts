import { Container, DestroyOptions, PointData, Polygon } from 'pixi.js';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

/**
 * A cell.
 *
 * Only handles cell geometry and pointer events (hit area),
 * cell is drawn by the theme board renderer.
 */
export default class Hex extends Container
{
    /**
     * Base radius of an hex cell
     */
    static readonly RADIUS = 20;

    /**
     * Padding applied to hex color when played
     */
    static readonly PADDING = 0.06;

    /**
     * Radius of cell with padding added to display grid
     */
    static readonly INNER_RADIUS = Hex.RADIUS * (1 - Hex.PADDING);

    /**
     * Radius of cell with border
     */
    static readonly OUTER_RADIUS = Hex.RADIUS * (1 + Hex.PADDING);

    constructor()
    {
        super();

        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i));
        }

        this.hitArea = new Polygon(path);
        this.eventMode = 'static';
    }

    static coords(row: number, col: number): PointData
    {
        return {
            x: col * Hex.RADIUS * SQRT3 + row * Hex.RADIUS * SQRT3 / 2,
            y: row * Hex.RADIUS * 1.5,
        };
    }

    /**
     * Get coords of hex corner
     *
     * @param i From 0 to 5:
     * ```
     * ..0
     * 5   1
     * 4   2
     * ..3
     * ```
     *
     * @param dist Distance to hex center, defaults to hex radius
     */
    static cornerCoords(i: number, dist: number = Hex.RADIUS): PointData
    {
        return {
            x: dist * sin(2 * PI * i / 6),
            y: -dist * cos(2 * PI * i / 6),
        };
    }

    override destroy(options?: DestroyOptions): void
    {
        super.destroy(options);
    }
}
