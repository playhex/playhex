import { Game, Move, PlayerIndex, PlayerInterface } from '@shared/game-engine';
import { Application, Container, Graphics, ICanvas, IPointData, Text, TextStyle } from 'pixi.js';
import Hex from '@client/pixi-board/Hex';
import { currentTheme } from '@client/pixi-board/BoardTheme';
import { themeSwitcherDispatcher } from '@client/DarkThemeSwitcher';
import { EventEmitter } from 'events';
import TypedEventEmitter from 'typed-emitter';
import { debounce } from 'debounce';
import SwapableSprite from './SwapableSprite';
import SwapedSprite from './SwapedSprite';
import { Coords } from '@shared/game-engine/Types';

const { min, max, sin, cos, sqrt, ceil, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

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

const orientationToRotation = (orientation: BoardOrientation): number => {
    switch (orientation) {
        case 'horizontal':
            return -1 * PI_6;

        case 'vertical':
            return 2 * PI_6;

        case 'horizontal_bias':
            return 0 * PI_6;

        case 'vertical_bias_right_hand':
            return -3 * PI_6;

        case 'vertical_bias_left_hand':
            return 1 * PI_6;
    }
};

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
    endedAndWinAnimationOver: () => void;
};

export default class GameView extends (EventEmitter as unknown as new () => TypedEventEmitter<GameViewEvents>)
{
    private hexes: Hex[][];
    private pixi: Application;
    private gameContainer: Container = new Container();
    private orientation: BoardOrientation;
    private sidesGraphics: [Graphics, Graphics];
    private displayCoords = false;
    private swapable: SwapableSprite;
    private swaped: SwapedSprite;

    private themeSwitchedListener = () => this.redraw();
    private resizeDebouncedListener = () => this.resizeRendererAndRedraw();

    constructor(
        private game: Game,
    ) {
        super();

        const wrapperSize = this.getWrapperSize();

        this.pixi = new Application({
            antialias: true,
            backgroundAlpha: 0,
            resolution: ceil(window.devicePixelRatio),
            autoDensity: true,
            width: wrapperSize.width,
            height: wrapperSize.height,
        });

        this.pixi.stage.addChild(this.gameContainer);

        this.redraw();
        this.listenModel();

        window.addEventListener('resizeDebounced', this.resizeDebouncedListener);
        themeSwitcherDispatcher.on('themeSwitched', this.themeSwitchedListener);

        if (this.game.isEnded()) {
            this.endedCallback();
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
            this.createColoredSides(),
        );

        if (this.displayCoords) {
            this.gameContainer.addChild(this.createCoords());
        }

        this.swapable = this.createSwapable();
        this.swaped = this.createSwaped();

        this.createAndAddHexes();
        this.highlightSidesFromGame();

        this.gameContainer.addChild(
            this.swapable,
            this.swaped,
        );
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
        this.setBoardRotation(orientationToRotation(orientation));
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

        let boxWidth = boardMaxCorner1.x - boardMaxCorner0.x + Hex.RADIUS * 2;
        let boxHeight = boardMaxCorner1.y - boardMaxCorner0.y + Hex.RADIUS;

        // Add margin to display coords around the board
        if (this.displayCoords) {
            boxWidth += Hex.RADIUS * 2;
            boxHeight += Hex.RADIUS * 2;
        }

        const scale = min(
            wrapperSize.width / boxWidth,
            wrapperSize.height / boxHeight,
        );

        this.gameContainer.scale = { x: scale, y: scale };
    }

    private async endedCallback(): Promise<void>
    {
        this.highlightSidesFromGame();

        await this.animateWinningPath();

        this.emit('endedAndWinAnimationOver');
    }

    private listenModel(): void
    {
        this.game.on('started', () => {
            this.highlightSidesFromGame();
        });

        this.game.on('played', (move, moveIndex, byPlayerIndex) => {
            this.resetHighlightedHexes();

            this.hexes[move.row][move.col].setPlayer(byPlayerIndex);

            switch (this.game.getMovesHistory().length) {
                case 1:
                    if (this.game.canSwapNow()) {
                        this.showSwapable(move);
                    } else {
                        this.hexes[move.row][move.col].setHighlighted();
                    }

                    break;

                case 2: {
                    const swapMove = this.game.isLastMoveSwapPieces();

                    if (null === swapMove) {
                        this.hexes[move.row][move.col].setHighlighted();
                        break;
                    }

                    const { swapped, mirror } = swapMove;

                    this.hexes[swapped.row][swapped.col].setPlayer(null);
                    this.hexes[mirror.row][mirror.col].setPlayer(byPlayerIndex);
                    this.showSwaped(mirror);

                    break;
                }

                default:
                    this.hexes[move.row][move.col].setHighlighted();
            }

            this.highlightSidesFromGame();
        });

        this.game.on('ended', () => this.endedCallback());
        this.game.on('canceled', () => this.endedCallback());
    }

    resetHighlightedHexes(): void
    {
        this.game.getMovesHistory().forEach((move) => {
            this.hexes[move.row][move.col].setHighlighted(false);
        });

        if (this.game.getAllowSwap()) {
            this.showSwapable(false);
            this.showSwaped(false);
        }
    }

    private async animateWinningPath(): Promise<void>
    {
        const winningPath = this.game.getBoard().getShortestWinningPath();

        if (null === winningPath) {
            // No winning path, winner has won by another outcome (opponent resigned, time out, ...)
            return;
        }

        const promises = winningPath.map(async ({ row, col }, i): Promise<void> => {
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

        this.highlightLastMove();
    }

    private highlightLastMove(): void
    {
        const lastMove = this.game.getLastMove();

        if (null === lastMove) {
            return;
        }

        if (this.game.getAllowSwap()) {
            if (1 === this.game.getMovesHistory().length) {
                this.showSwapable(lastMove);
                return;
            }

            const swapPieces = this.game.isLastMoveSwapPieces();

            if (null !== swapPieces) {
                this.showSwaped(swapPieces.mirror);
                return;
            }
        }

        this.hexes[lastMove.row][lastMove.col].setHighlighted();
    }

    private createColoredSides(): Container
    {
        // Initialize both sides at class level to change them later (light on/off)
        this.sidesGraphics = [new Graphics(), new Graphics()];

        let g: Graphics;
        const to = (a: IPointData, b: IPointData = { x: 0, y: 0 }) => g.lineTo(a.x + b.x, a.y + b.y);
        const m = (a: IPointData, b: IPointData = { x: 0, y: 0 }) => g.moveTo(a.x + b.x, a.y + b.y);

        // Set sides colors
        this.sidesGraphics[0].lineStyle(Hex.RADIUS * 0.6, currentTheme.colorA);
        this.sidesGraphics[1].lineStyle(Hex.RADIUS * 0.6, currentTheme.colorB);

        // From a1 to i1 (red)
        g = this.sidesGraphics[0];
        g.moveTo(Hex.cornerCoords(5).x, Hex.cornerCoords(5).y);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        // From i1 to i9 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(0, this.game.getSize() - 1), Hex.cornerCoords(0));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(2));
        }

        // From i9 to a9 (red)
        g = this.sidesGraphics[0];
        m(Hex.coords(this.game.getSize() - 1, this.game.getSize() - 1), Hex.cornerCoords(2));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(4));
        }

        // From a9 to a1 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(this.game.getSize() - 1, 0), Hex.cornerCoords(4));

        for (let i = 0; i < this.game.getSize(); ++i) {
            if (i) to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(5));
        }

        // Add both sides into a single container
        const sidesContainer = new Container();
        sidesContainer.addChild(...this.sidesGraphics);

        return sidesContainer;
    }

    getDisplayCoords(): boolean
    {
        return this.displayCoords;
    }

    setDisplayCoords(visible = true): GameView
    {
        this.displayCoords = visible;
        this.redraw();

        return this;
    }

    toggleDisplayCoords(): GameView
    {
        return this.setDisplayCoords(!this.displayCoords);
    }

    private createCoords(): Container
    {
        const container = new Container();

        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 0.6,
            fill: currentTheme.textColor,
        });

        const createText = (string: string, x: number, y: number): Text => {
            const text = new Text(string, coordsTextStyle);

            text.resolution = window.devicePixelRatio * 2;
            text.rotation = -orientationToRotation(this.orientation);
            text.anchor.set(0.5, 0.5);

            const hexCoords = Hex.coords(x, y);
            text.position.set(hexCoords.x, hexCoords.y);

            return text;
        };

        for (let i = 0; i < this.game.getSize(); ++i) {
            const number = Move.rowToNumber(i);
            container.addChild(createText(number, i, -1));
            container.addChild(createText(number, i, this.game.getSize()));

            const letter = Move.colToLetter(i);
            container.addChild(createText(letter, -1, i));
            container.addChild(createText(letter, this.game.getSize(), i));
        }

        return container;
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
        if (!this.game.isStarted() || this.game.isCanceled()) {
            this.highlightSides(true, true);
            return;
        }

        if (!this.game.isEnded()) {
            this.highlightSideForPlayer(this.game.getCurrentPlayerIndex());
            return;
        }

        this.highlightSideForPlayer(this.game.getStrictWinner());
    }

    private createSwapable(): SwapableSprite
    {
        const swapable = new SwapableSprite();

        swapable.rotation = -orientationToRotation(this.orientation);
        swapable.visible = false;

        return swapable;
    }

    private createSwaped(): SwapedSprite
    {
        const swaped = new SwapedSprite();

        swaped.rotation = -orientationToRotation(this.orientation);
        swaped.visible = false;

        return swaped;
    }

    showSwapable(swapable: Coords | false): this
    {
        if (false === swapable) {
            this.swapable.visible = false;
            return this;
        }

        this.swapable.position = Hex.coords(swapable.row, swapable.col);
        this.swapable.visible = true;

        return this;
    }

    showSwaped(swaped: Coords | false): this
    {
        if (false === swaped) {
            this.swaped.visible = false;
            return this;
        }

        this.swaped.position = Hex.coords(swaped.row, swaped.col);
        this.swaped.visible = true;

        return this;
    }

    getHex(rowCol: { row: number, col: number }): Hex
    {
        return this.hexes[rowCol.row][rowCol.col];
    }

    destroy(): void
    {
        this.pixi.destroy(true);

        window.removeEventListener('resizeDebounced', this.resizeDebouncedListener);
        themeSwitcherDispatcher.off('themeSwitched', this.themeSwitchedListener);
    }
}
