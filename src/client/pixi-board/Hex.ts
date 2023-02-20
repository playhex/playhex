import { Graphics, IPointData, Sprite, Ticker } from 'pixi.js';
import { PlayerIndex } from '@shared/game-engine';
import { currentTheme } from './BoardTheme';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

const animationDuration = 50;
const animationCurve = Array(animationDuration).fill(0).map((_, i) => {
    const x = i / animationDuration;

    return 1 - (2 * (x - 1) ** 2 - 1) ** 2;
});

export default class Hex extends Sprite
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

    private emptyColor: Graphics;
    private hexColor: Graphics;
    private highlight: Graphics;

    constructor(initialValue: null | PlayerIndex = null)
    {
        super();

        this.redrawHex();
        this.setPlayer(initialValue);

        this.interactive = true;
    }

    private redrawHex(): void
    {
        this.removeChildren();

        this.addChild(
            this.createBackground(),
            this.emptyColor = this.createEmptyColor(),
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
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.OUTER_RADIUS));
        }

        g.lineStyle(0);
        g.beginFill(currentTheme.strokeColor, 1);
        g.drawPolygon(path);
        g.endFill();

        return g;
    }

    /**
     * Hex background
     */
    private createEmptyColor(): Graphics
    {
        const g = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        g.lineStyle(0);
        g.beginFill(currentTheme.colorEmpty);
        g.drawPolygon(path);
        g.endFill();

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
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS));
        }

        g.lineStyle(0);
        g.beginFill(0xffffff);
        g.drawPolygon(path);
        g.endFill();
        g.visible = false;

        return g;
    }

    /**
     * Shape inside the hex displayed on hex to show last move
     */
    private createHighlight(): Graphics
    {
        const g = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * 0.3));
        }

        g.lineStyle(0);
        g.beginFill(0xffffff, 0.4);
        g.drawPolygon(path);
        g.endFill();

        g.visible = false;

        return g;
    }

    static coords(row: number, col: number): IPointData
    {
        return {
            x: col * Hex.RADIUS * SQRT3 + row * Hex.RADIUS * SQRT3 / 2,
            y: row * Hex.RADIUS * 1.5,
        };
    }

    static cornerCoords(i: number, dist: number = Hex.RADIUS): IPointData
    {
        return {
            x: dist * sin(2 * PI * i / 6),
            y: -dist * cos(2 * PI * i / 6),
        };
    }

    setPlayer(player: null|PlayerIndex): Hex
    {
        this.hexColor.visible = null !== player;

        if (null !== player) {
            this.hexColor.tint = [
                currentTheme.colorA,
                currentTheme.colorB,
            ][player];
        }

        return this;
    }

    setHighlighted(highlighted = true): Hex
    {
        this.highlight.visible = highlighted;

        return this;
    }

    async animate(): Promise<void>
    {
        return new Promise(resolve => {
            let i = 0;

            const animationLoop = (): void => {
                if (i >= animationDuration) {
                    this.hexColor.scale = {x: 1, y: 1};
                    Ticker.shared.remove(animationLoop);
                    resolve();
                    return;
                }

                const coef = 1 - 0.75 * animationCurve[i];
                this.hexColor.scale = {x: coef, y: coef};
                ++i;
            };

            Ticker.shared.add(animationLoop);
        });
    }
}
