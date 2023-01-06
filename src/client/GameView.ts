import { Game, Move } from '@shared/game-engine';
import { Application, Container, Graphics, ICanvas, IPointData, Ticker } from 'pixi.js';
import Hex from '@client/Hex';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';
import { Coords } from '@shared/game-engine/Types';
import { currentTheme } from '@shared/Themes';

const { min, max, sin, cos, sqrt, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;

export type BoardOrientation =
    /**
     * Displayed as horizontal diamond.
     * Recommended for large screen.
     */
    'horizontal'

    /**
     * Displayed as vertical diamond.
     */
    | 'vertical'

    /**
     * Displayed as horizontal,
     * but not symmetric          __
     * to optimize screen space: /_/
     */
    | 'horizontal_bias'

    /**
     * Displayed as vertical,
     * but not symmetric         /|
     * to optimize screen space. |/
     * Recommended for mobile screens.
     */
    | 'vertical_bias_right_hand'

    /**
     * Same as right_hand, but board goes |\
     * from top left to bottom right.     \|
     */
    | 'vertical_bias_left_hand'
;

export type GameViewOptions = {
    width: number;
    height: number;
};

const margin = min(window.innerWidth, window.innerHeight) * 0.1;
const defaultOptions: GameViewOptions = {
    width: window.innerWidth - margin,
    height: window.innerHeight - margin,
}

export default class GameView
{
    private hexes: Hex[][];
    private pixi: Application;
    private gameContainer: Container = new Container();
    private orientation: BoardOrientation;

    constructor(
        private game: Game,
        private moveController: MoveControllerInterface,
        private options: GameViewOptions = defaultOptions,
    ) {
        this.pixi = new Application({
            antialias: true,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio,
            autoDensity: true,
            width: options.width,
            height: options.height,
        });

        if (window.innerWidth > window.innerHeight) {
            this.setOrientation('horizontal');
        } else {
            this.setOrientation('vertical_bias_right_hand');
        }

        this.gameContainer.pivot = Hex.coords(
            this.game.getSize() / 2 - 0.5,
            this.game.getSize() / 2 - 0.5,
        );

        this.gameContainer.position = {
            x: options.width / 2,
            y: options.height / 2,
        };

        this.drawBackground();
        this.createBoard();
        this.listenModel();

        this.pixi.stage.addChild(this.gameContainer);
    }

    getGame()
    {
        return this.game;
    }

    getView(): ICanvas
    {
        return this.pixi.view;
    }

    getOrientation()
    {
        return this.orientation;
    }

    /**
     * Change orientation and rescale to fit screen.
     *
     * "bias" orientations allow to fit better screen,
     * ans non-bias orientations are more symmetric but makes board smaller.
     */
    setOrientation(orientation: BoardOrientation): void
    {
        this.orientation = orientation;

        switch (orientation) {
            case 'horizontal':
                this.setBoardRotation(5 * (Math.PI / 6));
                break;

            case 'vertical':
                this.setBoardRotation(2 * (Math.PI / 6));
                break;

            case 'horizontal_bias':
                this.setBoardRotation(0 * (Math.PI / 6));
                break;

            case 'vertical_bias_right_hand':
                this.setBoardRotation(3 * (Math.PI / 6));
                break;

            case 'vertical_bias_left_hand':
                this.setBoardRotation(1 * (Math.PI / 6));
                break;
        }
    }

    setBoardRotation(radians: number): void
    {
        this.gameContainer.rotation = radians;
        this.autoResize();
    }

    incrementBoardRotation(radians: number): void
    {
        this.gameContainer.rotation += radians;
        this.autoResize();
    }

    autoResize(): void
    {
        const { rotation } = this.gameContainer;

        const boardHeight = Hex.RADIUS * this.game.getSize() * 1.5 - 0.5;
        const boardWidth = Hex.RADIUS * this.game.getSize() * SQRT_3_2;

        const boardCorner0 = {
            x: this.options.width / 2 + boardHeight * cos(rotation + 3.5 * PI_3),
            y: this.options.height / 2 + boardHeight * sin(rotation + 3.5 * PI_3),
        };

        const boardCorner1 = {
            x: this.options.width / 2 + boardWidth * cos(rotation - PI_3),
            y: this.options.height / 2 + boardWidth * sin(rotation - PI_3),
        };

        const boardCorner2 = {
            x: this.options.width - boardCorner0.x,
            y: this.options.height - boardCorner0.y,
        };

        const boardCorner3 = {
            x: this.options.width - boardCorner1.x,
            y: this.options.height - boardCorner1.y,
        };

        const boardMaxCorner0 = {
            x: min(boardCorner0.x, boardCorner1.x, boardCorner2.x, boardCorner3.x),
            y: min(boardCorner0.y, boardCorner1.y, boardCorner2.y, boardCorner3.y),
        };

        const boardMaxCorner1 = {
            x: max(boardCorner0.x, boardCorner1.x, boardCorner2.x, boardCorner3.x),
            y: max(boardCorner0.y, boardCorner1.y, boardCorner2.y, boardCorner3.y),
        };

        const boxWidth = boardMaxCorner1.x - boardMaxCorner0.x + Hex.RADIUS;
        const boxHeight = boardMaxCorner1.y - boardMaxCorner0.y + Hex.RADIUS;

        const scale = min(
            this.options.width / boxWidth,
            this.options.height / boxHeight,
        );

        this.gameContainer.scale = {x: scale, y: scale};
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
            console.log('winner is', winner);
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

                this.gameContainer.addChild(hex);

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

        graphics.lineStyle(Hex.RADIUS * 0.6, currentTheme.colorB);

        graphics.moveTo(Hex.cornerCoords(5).x, Hex.cornerCoords(5).y);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, currentTheme.colorA);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(2));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, currentTheme.colorB);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(4));
        }

        graphics.lineStyle(Hex.RADIUS * 0.6, currentTheme.colorA);

        for (let i = 0; i < this.game.getSize(); ++i) {
            if (i) to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(5));
        }

        this.gameContainer.addChild(graphics);
    }

    getHex(rowCol: {row: number, col: number}): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }

    destroy()
    {
        this.pixi.destroy();
    }

    private displayDebug(): void
    {
        const debugContainer = new Container();
        const g = new Graphics();

        g.lineStyle({
            color: 0x0000ff,
            width: 4,
        });

        g.drawRect(0, 0, this.options.width, this.options.height);
        this.p({x: this.options.width / 2, y: this.options.height / 2});

        debugContainer.addChild(g);
        this.pixi.stage.addChild(debugContainer);
    }

    private p(p: IPointData): void
    {
        const g = new Graphics();

        g.lineStyle({
            color: 0x0000ff,
            width: 4,
        });

        g.drawCircle(p.x, p.y, 4);
        this.pixi.stage.addChild(g);
    }
}
