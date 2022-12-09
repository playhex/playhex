import { Graphics, IPointData, Sprite } from 'pixi.js';
import { Player } from './Types';

const { PI, cos, sin, sqrt } = Math;
const SQRT3 = sqrt(3);

export default class Hex extends Sprite
{
    public static readonly RADIUS = 20;

    public static readonly COLOR_A = 0xff8888;
    public static readonly COLOR_B = 0x8888ff;
    public static readonly COLOR_NONE = 0xcccccc;

    private graphics: Graphics;
    private player: Player;

    constructor()
    {
        super();

        this.drawHexBackground();
        this.drawHex();
        this.setPlayer('NONE');

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
        background.beginFill(0xffffff, 1);
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

    public static coords(row: number, col: number): IPointData
    {
        return {
            x: col * Hex.RADIUS * SQRT3 + row * Hex.RADIUS * SQRT3 / 2,
            y: row * Hex.RADIUS * 1.5,
        };
    }

    public static cornerCoords(i: number, dist: number = Hex.RADIUS): IPointData
    {
        return {
            x: dist * sin(2 * PI * i / 6),
            y: -dist * cos(2 * PI * i / 6),
        };
    }

    public switch(): void
    {
        const next: {[key in Player]: Player} = {
            A: 'B',
            B: 'NONE',
            NONE: 'A',
        };

        this.setPlayer(next[this.player]);
    }

    public setPlayer(player: Player): Hex
    {
        this.player = player;
        this.graphics.tint = {
            A: Hex.COLOR_A,
            B: Hex.COLOR_B,
            NONE: Hex.COLOR_NONE,
        }[player];

        return this;
    }
}
