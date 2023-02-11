import { Graphics, IPointData, Sprite } from 'pixi.js';
import { PlayerIndex } from '@shared/game-engine';
import { currentTheme } from './BoardTheme';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

export default class Hex extends Sprite
{
    static readonly RADIUS = 20;

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
            this.hexColor = this.createHexColor(),
            this.highlight = this.createHighlight(),
        );
    }

    private createBackground(): Graphics
    {
        const g = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push({
                x: (Hex.RADIUS * 1.1) * sin(2 * PI * i / 6),
                y: (Hex.RADIUS * 1.1) * cos(2 * PI * i / 6),
            });
        }

        g.lineStyle(0);
        g.beginFill(currentTheme.strokeColor, 1);
        g.drawPolygon(path);
        g.endFill();

        return g;
    }

    private createHexColor(): Graphics
    {
        const g = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * 0.98));
        }

        g.lineStyle(0);
        g.beginFill(0xffffff, 1);
        g.drawPolygon(path);
        g.endFill();

        return g;
    }

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
        this.hexColor.tint = null === player
            ? currentTheme.colorEmpty
            : [
                currentTheme.colorA,
                currentTheme.colorB,
            ][player]
        ;

        return this;
    }

    setHighlighted(highlighted = true): Hex
    {
        this.highlight.visible = highlighted;

        return this;
    }
}
