import EventEmitter from 'events';
import { Game } from '@shared/game-engine';
import { Container, DisplayObject, Graphics, IPointData } from 'pixi.js';
import TypedEmitter from 'typed-emitter';
import Hex from './Hex';

type GameViewEvents = {
    hexClicked: (coords: {row: number, col: number}) => void;
}

export default class GameView extends (EventEmitter as unknown as new () => TypedEmitter<GameViewEvents>)
{
    private hexes: Hex[][];
    private size: number;
    private view: Container;

    public constructor(
        private game: Game,
    ) {
        super();

        this.size = game.getBoard().getSize();
        this.view = new Container();

        this.drawBackground();
        this.createBoard();
        this.listenModel();
    }

    public getView(): DisplayObject
    {
        return this.view;
    }

    private listenModel(): void
    {
        this.game.on('move', (move, playerIndex) => {
            this.hexes[move.getRow()][move.getCol()].setPlayer(playerIndex);
        });
    }

    private createBoard(): void
    {
        this.hexes = Array(this.size).fill(null).map(() => Array(this.size));

        for (let row = 0; row < this.size; ++row) {
            for (let col = 0; col < this.size; ++col) {
                const hex = new Hex();

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                this.view.addChild(hex);

                hex.on('pointertap', () => {
                    this.emit('hexClicked', {row, col});
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

        this.view.addChild(graphics);
    }

    public getHex(rowCol: {row: number, col: number}): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }
}
