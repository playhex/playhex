import { Container, Graphics, IPointData } from 'pixi.js';
import Hex from './Hex';

export default class BoardView extends Container
{
    private hexes: Hex[][];

    public constructor(
        private size: number = 11,
    ) {
        super();

        this.drawBackground();
        this.createBoard();
    }

    private createBoard(): void
    {
        this.hexes = Array(this.size).fill(null).map(() => Array(this.size));

        for (let row = 0; row < this.size; ++row) {
            for (let col = 0; col < this.size; ++col) {
                const hex = new Hex();

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                this.addChild(hex);

                hex.on('pointertap', () => {
                    this.emit<any>('hexClicked', {row, col});
                });
            }
        }
    }

    private drawBackground(): void
    {
        const graphics = new Graphics();
        const to = (a: IPointData, b: IPointData = {x: 0, y: 0}): void => {
            graphics.lineTo(a.x + b.x, a.y + b.y);
        };

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_B);

        graphics.moveTo(Hex.cornerCoords(5).x, Hex.cornerCoords(5).y);

        for (let i = 0; i < this.size; ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_A);

        for (let i = 0; i < this.size; ++i) {
            to(Hex.coords(i, this.size - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.size - 1), Hex.cornerCoords(2));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_B);

        for (let i = 0; i < this.size; ++i) {
            to(Hex.coords(this.size - 1, this.size - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.size - 1, this.size - i - 1), Hex.cornerCoords(4));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_A);

        for (let i = 0; i < this.size; ++i) {
            if (i) to(Hex.coords(this.size - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.size - i - 1, 0), Hex.cornerCoords(5));
        }

        this.addChild(graphics);
    }

    public getHex(rowCol: {row: number, col: number}): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }
}
