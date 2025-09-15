import { Container, DestroyOptions, Graphics, PointData, Ticker } from 'pixi.js';
import { PlayerIndex } from '../game-engine/index.js';
import { colorAverage } from './colorUtils.js';
import { Theme } from './BoardTheme.js';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

const animationDuration = 50;
const animationCurve = Array(animationDuration).fill(0).map((_, i) => {
    const x = i / animationDuration;

    return 1 - (2 * (x - 1) ** 2 - 1) ** 2;
});

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

    private hexColor: Graphics;
    private highlight: Graphics;
    private dotContainer: Container = new Container();
    private animationLoop: null | (() => void) = null;

    constructor(
        private theme: Theme,

        /**
         * null: empty cell
         * 0 or 1: red or blue
         */
        private playerIndex: null | PlayerIndex = null,

        /**
         * Shading to apply, between 0 and 1.
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

        this.redrawHex();
        this.setPlayer(playerIndex);

        this.eventMode = 'static';
    }

    private redrawHex(): void
    {
        this.removeChildren();

        this.addChild(
            this.createBackground(),
            this.createEmptyColor(),
            this.dotContainer,
            this.hexColor = this.createHexColor(),
            this.highlight = this.createHighlight(),
        );
    }

    /**
     * Border of hex
     */
    private createBackground(): Graphics
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.OUTER_RADIUS));
        }

        g.poly(path);
        g.fill({ color: this.theme.strokeColor, alpha: 1 });

        return g;
    }

    /**
     * Hex background
     */
    private createEmptyColor(): Graphics
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        g.poly(path);
        g.fill({ color: colorAverage(
            this.theme.colorEmpty,
            this.theme.colorEmptyShade,
            this.shading,
        ) });

        return g;
    }

    /**
     * Hex color when played.
     * White, then change tint to set color.
     * Hidden if not played yet.
     */
    private createHexColor(): Graphics
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        g.poly(path);
        g.fill({ color: 0xffffff });
        g.visible = false;

        return g;
    }

    /**
     * Shape inside the hex displayed on hex to show last move
     */
    private createHighlight(): Graphics
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

    /**
     * Show dot for starting anchors
     */
    showDot(): void
    {
        this.dotContainer.removeChildren();

        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.2);
        g.fill({ color: this.theme.textColor, alpha: 0.2 });

        this.dotContainer.addChild(g);
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

    private updateColor(): void
    {
        this.hexColor.visible = this.playerIndex !== null;
        this.hexColor.alpha = 1;

        if (this.playerIndex !== null) {
            this.hexColor.tint = [
                this.theme.colorA,
                this.theme.colorB,
            ][this.playerIndex];
        }
    }

    setPlayer(playerIndex: null | PlayerIndex): this
    {
        this.playerIndex = playerIndex;
        this.updateColor();

        return this;
    }

    previewMove(playerIndex: PlayerIndex): this
    {
        this.hexColor.visible = true;
        this.hexColor.alpha = 0.5;

        this.hexColor.tint = [
            this.theme.colorA,
            this.theme.colorB,
        ][playerIndex];

        return this;
    }

    removePreviewMove(): this
    {
        this.updateColor();

        return this;
    }

    setHighlighted(highlighted = true): this
    {
        this.highlight.visible = highlighted;

        return this;
    }

    private clearAnimationLoop(): void
    {
        if (this.animationLoop !== null) {
            if (this.destroyed) {
                // Call animationLoop to resolve promise if destroyed and prevent let it unresolved
                this.animationLoop();
            } else {
                this.hexColor.scale = { x: 1, y: 1 };
            }

            Ticker.shared.remove(this.animationLoop);
            this.animationLoop = null;
        }
    }

    async animate(): Promise<void>
    {
        this.clearAnimationLoop();

        return await new Promise(resolve => {
            let i = 0;

            this.animationLoop = (): void => {
                if (this.destroyed) {
                    resolve();
                    return;
                }

                if (i >= animationDuration) {
                    this.clearAnimationLoop();
                    resolve();
                    return;
                }

                const coef = 1 - 0.75 * animationCurve[i];
                this.hexColor.scale = { x: coef, y: coef };
                ++i;
            };

            Ticker.shared.add(this.animationLoop);
        });
    }

    override destroy(options?: DestroyOptions): void
    {
        super.destroy(options);

        // Must be after destroy, so animation knows it's destroyed and can resolve
        this.clearAnimationLoop();
    }
}
