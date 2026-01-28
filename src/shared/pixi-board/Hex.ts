import { Container, DestroyOptions, Graphics, PointData } from 'pixi.js';
import { Theme } from './BoardTheme.js';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

/**
 * A cell.
 *
 * Default PlayHex theme, only themed by colors, stones are full hexagons.
 *
 * Contains layers:
 * - background, always shown, covers hex board
 * - fading, for shading patterns
 * - stone, may be faded for preview moves
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

    /**
     * Stroke color and empty cell color
     */
    private cellBackgroundGraphics: Graphics;

    /**
     * Layer, variable alpha depending on shading pattern
     */
    private cellShading: Container;

    constructor(
        private theme: Theme,

        /**
         * Shading to apply to background, between 0 and 1.
         * 0 = not shaded, 1 = shaded,
         * 0.5 = half-shaded (i.e for tri color shading patterns)...
         */
        private shading: number = 0,
    ) {
        super();

        if (shading < 0) {
            shading = 0;
        } else if (shading > 1) {
            shading = 1;
        }

        this.init();

        this.eventMode = 'static';
    }

    private init(): void
    {
        this.addChild(
            this.createCell(),
            this.cellShading = this.createCellShading(),
        );

        this.redrawHex();
    }

    private createCell(): Container
    {
        const container = new Container();
        this.cellBackgroundGraphics = new Graphics();

        container.addChild(this.cellBackgroundGraphics);

        return container;
    }

    private createCellShading(): Container
    {
        const container = new Container();
        const g = new Graphics();

        const innerPath: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            innerPath.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        g.poly(innerPath);
        g.fill({ color: this.theme.colorEmptyShade });

        container.addChild(g);

        return container;
    }

    /**
     * Redraw cell, fading and stone when theme changed
     */
    private redrawHex(): void
    {
        // Redraw cell background with theme colors
        this.cellBackgroundGraphics.clear();

        // background, stroke color
        const outperPath: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            outperPath.push(Hex.cornerCoords(i, Hex.OUTER_RADIUS));
        }

        this.cellBackgroundGraphics.poly(outperPath);
        this.cellBackgroundGraphics.fill({ color: this.theme.strokeColor });

        // cell, empty cell color
        const innerPath: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            innerPath.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        this.cellBackgroundGraphics.poly(innerPath);
        this.cellBackgroundGraphics.fill({ color: this.theme.colorEmpty });

        // Update fading
        this.cellShading.alpha = this.shading;
    }

    updateTheme(theme: Theme): void
    {
        this.theme = theme;

        this.redrawHex();
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
