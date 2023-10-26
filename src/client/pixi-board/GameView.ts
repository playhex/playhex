import { Game, Move, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { Application, Container, Graphics, ICanvas, IPointData } from 'pixi.js';
import Hex from '@client/pixi-board/Hex';
import { currentTheme } from '@client/pixi-board/BoardTheme';
import { themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';
import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { debounce } from 'debounce';

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

export type GameViewSize = {
    width: number;
    height: number;
};

window.addEventListener('resize', debounce(() => {
    window.dispatchEvent(new CustomEvent('resizeDebounced'));
}, 60));

type GameViewEvents = {
    /**
     * A hex has been clicked on the view.
     */
    hexClicked: (move: Move) => void;

    /**
     * Game has ended, and win animation is over.
     * Used to display win message after animation, and not at same time.
     */
    endedAndWinAnimationOver: (winner: PlayerIndex) => void;
};

export default class GameView extends (EventEmitter as unknown as new () => TypedEventEmitter<GameViewEvents>)
{
    private hexes: Hex[][];
    private pixi: Application;
    private gameContainer: Container = new Container();
    private orientation: BoardOrientation;
    private sidesGraphics: [Graphics, Graphics];

    constructor(
        private game: Game,
    ) {
        super();

        const wrapperSize = this.getWrapperSize();

        this.pixi = new Application({
            antialias: true,
            backgroundAlpha: 0,
            resolution: window.devicePixelRatio,
            autoDensity: true,
            width: wrapperSize.width,
            height: wrapperSize.height,
        });

        this.pixi.stage.addChild(this.gameContainer);

        this.redraw();
        this.listenModel();

        window.addEventListener('resizeDebounced', () => this.resizeRendererAndRedraw());
        themeSwitcherDispatcher.on('themeSwitched', () => this.redraw());

        if (this.game.isEnded()) {
            this.animateWinningPath();
        }
    }

    private redraw(): void
    {
        this.gameContainer.removeChildren();

        if (window.innerWidth > window.innerHeight) {
            this.setOrientation('horizontal');
        } else {
            this.setOrientation('vertical_bias_right_hand');
        }

        this.gameContainer.pivot = Hex.coords(
            this.game.getSize() / 2 - 0.5,
            this.game.getSize() / 2 - 0.5,
        );

        const wrapperSize = this.getWrapperSize();

        this.gameContainer.position = {
            x: wrapperSize.width / 2,
            y: wrapperSize.height / 2,
        };

        this.gameContainer.addChild(
            this.createBackground(),
        );

        this.createAndAddHexes();
        this.highlightSidesFromGame();
    }

    private resizeRendererAndRedraw(): void
    {
        if (!this.pixi.renderer) {
            return;
        }

        const wrapperSize = this.getWrapperSize();

        this.pixi.renderer.resize(wrapperSize.width, wrapperSize.height);
        this.redraw();
    }

    bindPlayer(player: null | PlayerInterface): this
    {
        this.on('hexClicked', move => {
            try {
                player?.move(move);
            } catch (e) {
                console.log('Move not played: ' + e);
            }
        });

        return this;
    }

    getWrapperSize(): GameViewSize
    {
        return {
            width: min(window.innerWidth, screen.width),
            height: min(window.innerHeight, screen.height) - 80,
        };
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
        const wrapperSize = this.getWrapperSize();

        const boardCorner0 = {
            x: wrapperSize.width / 2 + boardHeight * cos(rotation + 3.5 * PI_3),
            y: wrapperSize.height / 2 + boardHeight * sin(rotation + 3.5 * PI_3),
        };

        const boardCorner1 = {
            x: wrapperSize.width / 2 + boardWidth * cos(rotation - PI_3),
            y: wrapperSize.height / 2 + boardWidth * sin(rotation - PI_3),
        };

        const boardCorner2 = {
            x: wrapperSize.width - boardCorner0.x,
            y: wrapperSize.height - boardCorner0.y,
        };

        const boardCorner3 = {
            x: wrapperSize.width - boardCorner1.x,
            y: wrapperSize.height - boardCorner1.y,
        };

        const boardMaxCorner0 = {
            x: min(boardCorner0.x, boardCorner1.x, boardCorner2.x, boardCorner3.x),
            y: min(boardCorner0.y, boardCorner1.y, boardCorner2.y, boardCorner3.y),
        };

        const boardMaxCorner1 = {
            x: max(boardCorner0.x, boardCorner1.x, boardCorner2.x, boardCorner3.x),
            y: max(boardCorner0.y, boardCorner1.y, boardCorner2.y, boardCorner3.y),
        };

        const boxWidth = boardMaxCorner1.x - boardMaxCorner0.x + Hex.RADIUS * 2;
        const boxHeight = boardMaxCorner1.y - boardMaxCorner0.y + Hex.RADIUS;

        const scale = min(
            wrapperSize.width / boxWidth,
            wrapperSize.height / boxHeight,
        );

        this.gameContainer.scale = {x: scale, y: scale};
    }

    private listenModel(): void
    {
        this.game.on('started', () => {
            this.highlightSidesFromGame();
        });

        this.game.on('played', (move, byPlayerIndex) => {
            this.resetHighlightedHexes();
            this.hexes[move.row][move.col]
                .setPlayer(byPlayerIndex)
                .setHighlighted()
            ;

            this.highlightSidesFromGame();
        });

        this.game.on('ended', async (winner) => {
            this.highlightSidesFromGame();

            await this.animateWinningPath();

            this.emit('endedAndWinAnimationOver', winner);
        });
    }

    resetHighlightedHexes(): void
    {
        this.game.getMovesHistory().forEach(move => {
            this.hexes[move.row][move.col].setHighlighted(false);
        });
    }

    private async animateWinningPath(): Promise<void>
    {
        const winningPath = this.game.getBoard().getShortestWinningPath();

        if (null === winningPath) {
            console.error('animateWinningPath called but no winner...');
            return;
        }

        const promises = winningPath.map(async ({row, col}, i): Promise<void> => {
            await new Promise(resolve => setTimeout(resolve, i * 80));
            await this.hexes[row][col].animate();
            this.hexes[row][col].setHighlighted();
        });

        await Promise.all(promises);
    }

    private createAndAddHexes(): void
    {
        this.hexes = Array(this.game.getSize()).fill(null).map(() => Array(this.game.getSize()));

        for (let row = 0; row < this.game.getSize(); ++row) {
            for (let col = 0; col < this.game.getSize(); ++col) {
                const hex = new Hex(this.game.getBoard().getCell(row, col));

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                this.gameContainer.addChild(hex);

                hex.on('pointertap', () => {
                    this.emit('hexClicked', new Move(row, col));
                });
            }
        }

        const lastMove = this.game.getLastMove();

        if (null !== lastMove) {
            this.hexes[lastMove.row][lastMove.col].setHighlighted();
        }
    }

    private createBackground(): Graphics
    {
        this.sidesGraphics = [new Graphics(), new Graphics()];
        let g: Graphics = this.sidesGraphics[0];
        const to = (a: IPointData, b: IPointData = {x: 0, y: 0}) => g.lineTo(a.x + b.x, a.y + b.y);
        const m = (a: IPointData, b: IPointData = {x: 0, y: 0}) => g.moveTo(a.x + b.x, a.y + b.y);

        this.sidesGraphics[0].lineStyle(Hex.RADIUS * 0.6, currentTheme.colorA);
        this.sidesGraphics[1].lineStyle(Hex.RADIUS * 0.6, currentTheme.colorB);

        g = this.sidesGraphics[1];
        g.moveTo(Hex.cornerCoords(5).x, Hex.cornerCoords(5).y);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        g = this.sidesGraphics[0];
        m(Hex.coords(0, this.game.getSize() - 1), Hex.cornerCoords(0));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(2));
        }

        g = this.sidesGraphics[1];
        m(Hex.coords(this.game.getSize() - 1, this.game.getSize() - 1), Hex.cornerCoords(2));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(4));
        }

        g = this.sidesGraphics[0];
        m(Hex.coords(this.game.getSize() - 1, 0), Hex.cornerCoords(4));

        for (let i = 0; i < this.game.getSize(); ++i) {
            if (i) to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(5));
        }

        const graphics = new Graphics();
        graphics.addChild(...this.sidesGraphics);
        return graphics;
    }

    highlightSides(red: boolean, blue: boolean): void
    {
        this.sidesGraphics[0].alpha = red ? 1 : 0.25;
        this.sidesGraphics[1].alpha = blue ? 1 : 0.25;
    }

    highlightSideForPlayer(playerIndex: PlayerIndex): void
    {
        this.highlightSides(
            0 === playerIndex,
            1 === playerIndex,
        );
    }

    highlightSidesFromGame(): void
    {
        if (!this.game.isStarted()) {
            this.highlightSides(true, true);
            return;
        }

        if (!this.game.isEnded()) {
            this.highlightSideForPlayer(this.game.getCurrentPlayerIndex());
            return;
        }

        this.highlightSideForPlayer(this.game.getStrictWinner());
    }

    getHex(rowCol: {row: number, col: number}): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }

    destroy(): void
    {
        this.pixi.destroy();
    }
}
