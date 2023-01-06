import { Graphics, IPointData, Sprite } from 'pixi.js';
import { PlayerIndex } from '@shared/game-engine';
import { currentTheme } from '@client/Themes';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

export default class Hex extends Sprite
{
    static readonly RADIUS = 20;

    private graphics: Graphics;

    constructor(initialValue: null | PlayerIndex = null)
    {
        super();

        this.drawHexBackground();
        this.drawHex();
        this.setPlayer(initialValue);

        this.interactive = true;
    }

    private drawHexBackground(): void
    {
        const background = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push({
                x: (Hex.RADIUS * 1.1) * sin(2 * PI * i / 6),
                y: (Hex.RADIUS * 1.1) * cos(2 * PI * i / 6),
            });
        }

        background.lineStyle(0);
        background.beginFill(currentTheme.strokeColor, 1);
        background.drawPolygon(path);
        background.endFill();

        this.addChild(background);
    }

    private drawHex(): void
    {
        this.graphics = new Graphics();
        const path: IPointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * 0.9));
        }

        this.graphics.lineStyle(0);
        this.graphics.beginFill(0xffffff, 1);
        this.graphics.drawPolygon(path);
        this.graphics.endFill();

        this.addChild(this.graphics);
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
        this.graphics.tint = null === player
            ? currentTheme.colorEmpty
            : [
                currentTheme.colorA,
                currentTheme.colorB,
            ][player]
        ;

        return this;
    }
}
