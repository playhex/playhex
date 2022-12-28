import { Game, Move } from '@shared/game-engine';
import { Container, DisplayObject, Graphics, IPointData, Ticker } from 'pixi.js';
import Hex from '@client/Hex';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';
import { Coords } from '@shared/game-engine/Types';

export default class GameView
{
    private hexes: Hex[][];
    private view: Container;

    constructor(
        private game: Game,
        private moveController: MoveControllerInterface,
    ) {
        this.view = new Container();

        this.drawBackground();
        this.createBoard();
        this.listenModel();
    }

    getView(): DisplayObject
    {
        return this.view;
    }

    private listenModel(): void
    {
        this.game.on('played', (move, playerIndex) => {
            this.hexes[move.getRow()][move.getCol()].setPlayer(playerIndex);
        });

        this.game.on('ended', async (winner) => {
            const winningPath = this.game.getShortestWinningPath();

            if (null === winningPath) {
                throw new Error('Winner but no winning path...');
            }

            await this.animateWinningPath(winningPath);

            // Win box
        });
    }

    private async animateWinningPath(cells: Coords[]): Promise<true>
    {
        let animationOverResolve: (end: true) => void;
        const animationOverPromise = new Promise<true>(resolve => animationOverResolve = () => resolve(true));

        const animationDuration = 50;

        const animationCurve = Array(animationDuration).fill(0).map((_, i) => {
            const x = i / animationDuration;

            return 1 - (2 * (x - 1) ** 2 - 1) ** 2;
        });

        const hexes = cells.map(cell => ({
            sprite: this.hexes[cell.row][cell.col],
            initialValue: this.hexes[cell.row][cell.col].alpha,
            animationStep: -1,
        }));

        const animationLoop = () => {
            hexes.forEach(hex => {
                if (hex.animationStep < 0) {
                    return;
                }

                hex.sprite.alpha = hex.initialValue - animationCurve[hex.animationStep];

                ++hex.animationStep;

                if (hex.animationStep >= animationDuration) {
                    hex.animationStep = -1;
                    hex.sprite.alpha = hex.initialValue;
                    hexes.splice(hexes.indexOf(hex), 1);

                    if (0 === hexes.length) {
                        Ticker.shared.remove(animationLoop);
                    }
                }
            });
        };

        Ticker.shared.add(animationLoop);

        hexes.forEach((hex, i) => {
            setTimeout(() => {
                hex.animationStep = 0;
            }, i * 60);
        });

        setTimeout(() => {
            animationOverResolve(true);
        }, hexes.length * 60);

        return animationOverPromise;
    }

    private createBoard(): void
    {
        this.hexes = Array(this.game.getSize()).fill(null).map(() => Array(this.game.getSize()));

        for (let row = 0; row < this.game.getSize(); ++row) {
            for (let col = 0; col < this.game.getSize(); ++col) {
                const hex = new Hex(this.game.getCell(row, col));

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                this.view.addChild(hex);

                hex.on('pointertap', () => {
                    this.moveController.move(this.game, new Move(row, col));
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

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_A);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(2));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_B);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(4));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, Hex.COLOR_A);

        for (let i = 0; i < this.game.getSize(); ++i) {
            if (i) to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(5));
        }

        this.view.addChild(graphics);
    }

    getHex(rowCol: {row: number, col: number}): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }
}
