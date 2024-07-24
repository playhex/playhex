import { Game, Move, PlayerIndex } from '@shared/game-engine';
import { Application, Container, Graphics, ICanvas, PointData, Text, TextStyle } from 'pixi.js';
import Hex from '@client/pixi-board/Hex';
import { Theme, themes } from '@client/pixi-board/BoardTheme';
import { TypedEmitter } from 'tiny-typed-emitter';
import debounceFunction from 'debounce-fn';
import SwapableSprite from './SwapableSprite';
import SwapedSprite from './SwapedSprite';
import { Coords } from '@shared/game-engine/Types';
import useDarkLightThemeStore from '../stores/darkLightThemeStore';
import usePlayerSettingsStore from '../stores/playerSettingsStore';
import usePlayerLocalSettingsStore from '../stores/playerLocalSettingsStore';
import { WatchStopHandle, watch } from 'vue';
import { createShadingPattern } from '../../shared/app/shading-patterns';

const { min, max, sin, cos, sqrt, ceil, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

/**
 * Integer, every PI/6.
 * Or an orientation depending on screen orientation.
 */
type PreferredOrientations = { landscape: number, portrait: number };

export type GameViewSize = {
    width: number;
    height: number;
};

type GameViewEvents = {
    /**
     * A hex has been clicked on the view.
     */
    hexClicked: (coords: Coords) => void;

    /**
     * Game has ended, and win animation is over.
     * Used to display win message after animation, and not at same time.
     */
    endedAndWinAnimationOver: () => void;

    orientationChanged: () => void;
};

export default class GameView extends TypedEmitter<GameViewEvents>
{
    static currentTheme: Theme;

    private hexes: Hex[][];
    private pixi: Application;
    private gameContainer: Container = new Container();

    private preferredOrientations: PreferredOrientations = {
        landscape: 11, // Diamond
        portrait: 9, // Vertical flat
    };

    private currentOrientation: number;

    private sidesGraphics: [Graphics, Graphics];
    private displayCoords = false;

    private lastSimpleMoveHighlighted: null | Coords = null;
    private swapable: SwapableSprite;
    private swaped: SwapedSprite;

    private previewedMove: null | { move: Move, playerIndex: PlayerIndex } = null;

    private resizeObserver: null | ResizeObserver = null;
    private themeSwitchedListener = () => this.redraw();
    private settingsChangedListener = () => this.redraw();

    private unwatchThemeSwitchedListener: WatchStopHandle;
    private unwatchSettingsChangedListener: WatchStopHandle;
    private unwatchLocalSettingsChangedListener: WatchStopHandle;

    private initPromise: Promise<void>;

    constructor(
        private game: Game,

        /**
         * Element in which this gameView should fit.
         * Game view will then auto fit when element size changes.
         * Element should be fixed size.
         */
        private containerElement: HTMLElement,
    ) {
        super();

        GameView.currentTheme = themes[useDarkLightThemeStore().displayedTheme()];

        this.pixi = new Application();

        this.initPromise = this.pixi.init({
            antialias: true,
            backgroundAlpha: 0,
            resolution: ceil(window.devicePixelRatio),
            autoDensity: true,
            resizeTo: this.containerElement,
            ...this.getWrapperSize(),
        });

        (async () => {
            await this.ready();

            this.listenContainerElementResize();

            this.pixi.stage.addChild(this.gameContainer);

            this.redraw();
            this.listenModel();

            this.unwatchThemeSwitchedListener = watch(useDarkLightThemeStore().displayedTheme, this.themeSwitchedListener);
            this.unwatchSettingsChangedListener = watch(() => usePlayerSettingsStore().playerSettings, this.settingsChangedListener, { deep: true });
            this.unwatchLocalSettingsChangedListener = watch(() => usePlayerLocalSettingsStore().localSettings.selectedBoardOrientation, this.settingsChangedListener);

            if (this.game.isEnded()) {
                this.highlightSidesFromGame();
                this.animateWinningPath();
            }
        })();
    }

    async ready(): Promise<void>
    {
        return this.initPromise;
    }

    /**
     * Returns which board orientation should be used
     * from game view wrapper ratio, and user preferred orientations for landscape and portrait.
     */
    getComputedBoardOrientation(): number
    {
        const wrapperSize = this.getWrapperSize();
        const { selectedBoardOrientation } = usePlayerLocalSettingsStore().localSettings;

        if ('auto' === selectedBoardOrientation) {
            return wrapperSize.width > wrapperSize.height
                ? this.preferredOrientations.landscape
                : this.preferredOrientations.portrait
            ;
        }

        return this.preferredOrientations[selectedBoardOrientation];
    }

    /**
     * Re-check screen ratio to change board orientation if needed
     */
    private updateOrientation(): void
    {
        const previousCurrentOrientation = this.currentOrientation;

        this.currentOrientation = this.getComputedBoardOrientation();

        if (previousCurrentOrientation !== this.currentOrientation) {
            this.emit('orientationChanged');
        }
    }

    private redraw(): void
    {
        GameView.currentTheme = themes[useDarkLightThemeStore().displayedTheme()];
        const wrapperSize = this.getWrapperSize();

        this.gameContainer.removeChildren();

        this.updateOrientation();

        this.gameContainer.rotation = this.currentOrientation * PI_6;

        this.gameContainer.pivot = Hex.coords(
            this.game.getSize() / 2 - 0.5,
            this.game.getSize() / 2 - 0.5,
        );

        this.gameContainer.position = {
            x: wrapperSize.width / 2,
            y: wrapperSize.height / 2,
        };

        this.autoResize();

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

        if (null !== this.previewedMove) {
            const { move, playerIndex } = this.previewedMove;
            this.previewMove(move, playerIndex);
        }

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

    private destroyResizeObserver(): void
    {
        if (null !== this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private listenContainerElementResize(): void
    {
        this.resizeRendererAndRedraw();
        this.destroyResizeObserver();

        this.resizeObserver = new ResizeObserver(debounceFunction(() => this.resizeRendererAndRedraw(), {
            wait: 60,
            before: true,
            after: true,
        }));

        this.resizeObserver.observe(this.containerElement);
    }

    getWrapperSize(): GameViewSize
    {
        return this.containerElement.getBoundingClientRect();
    }

    getGame()
    {
        return this.game;
    }

    getView(): ICanvas
    {
        return this.pixi.canvas;
    }

    getPreferredOrientations(): PreferredOrientations
    {
        return this.preferredOrientations;
    }

    setPreferredOrientations(preferredOrientations: PreferredOrientations): void
    {
        this.preferredOrientations = preferredOrientations;
        this.redraw();
    }

    /**
     * Returns current orientation used to display board,
     * in landscape or portrait if configured.
     */
    getCurrentOrientation(): number
    {
        return (this.currentOrientation + 12) % 12;
    }

    /**
     * Rescale the game board to fit in the container,
     * depending on board orientation.
     */
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

        let boxWidth = boardMaxCorner1.x - boardMaxCorner0.x;
        let boxHeight = boardMaxCorner1.y - boardMaxCorner0.y;

        // Add margin to prevent cells to be slightly cropped.
        // Depending on orientation, either width or height margin is needed.
        if ([1, 2, 3].includes(this.getCurrentOrientation() % 6)) {
            boxWidth += 30;
        } else {
            boxHeight += 30;
        }

        // Add margin to display coords around the board
        if (this.displayCoords) {
            boxWidth += Hex.RADIUS * 1.8;
            boxHeight += Hex.RADIUS * 1.8;
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

    /**
     * Returns swap coords from a game, and optionnal undone moves, assuming player swapped.
     *
     * While undoing swap move, we cannot get swap coords
     * because at this time, game has already undone moves, and has no first move.
     * So we assume next move of undoneMoves was first move.
     */
    private getSwapCoordsFromGameOrUndoneMoves(undoneMoves: null | Move[] = null): { swapped: Coords, mirror: Coords }
    {
        const swapCoords = this.game.getSwapCoords(false);

        if (swapCoords) {
            return swapCoords;
        }

        if (null === undoneMoves) {
            throw new Error('Cannot get swap coords from game: no swap move, or has been undone but no undoneMoves provided.');
        }

        let firstMove: null | Move = null;

        for (let i = 0; i < undoneMoves.length; ++i) {
            if ('swap-pieces' === undoneMoves[i].getSpecialMoveType()) {
                firstMove = undoneMoves[i + 1] ?? null;
            }
        }

        if (!firstMove) {
            throw new Error('Expected to have at least swap coords from game, or first move before swap move in undoneMoves');
        }

        return {
            mirror: firstMove.cloneMirror(),
            swapped: firstMove,
        };
    }

    private listenModel(): void
    {
        this.highlightSidesFromGame();

        this.game.on('played', (move, moveIndex, byPlayerIndex) => {

            // Update board cells
            switch (move.getSpecialMoveType()) {
                case undefined:
                    this.hexes[move.row][move.col].setPlayer(byPlayerIndex);
                    break;

                case 'swap-pieces': {
                    const { swapped, mirror } = this.getSwapCoordsFromGameOrUndoneMoves();

                    this.hexes[swapped.row][swapped.col].setPlayer(null);
                    this.hexes[mirror.row][mirror.col].setPlayer(byPlayerIndex);
                    break;
                }
            }

            this.removePreviewMove();
            this.highlightLastMove();
            this.highlightSidesFromGame();
        });

        this.game.on('undo', async undoneMoves => {
            this.removePreviewMove(undoneMoves);

            for (let i = 0; i < undoneMoves.length; ++i) {
                const move = undoneMoves[i];

                if (i > 0) {
                    // If two moves are undone, slightly wait between these two moves removal
                    await new Promise(r => setTimeout(r, 150));
                }

                switch (move.getSpecialMoveType()) {
                    case undefined:
                        this.hexes[move.row][move.col].setPlayer(null);
                        break;

                    case 'swap-pieces': {
                        const { mirror, swapped } = this.getSwapCoordsFromGameOrUndoneMoves(undoneMoves);

                        this.hexes[mirror.row][mirror.col].setPlayer(null);
                        this.hexes[swapped.row][swapped.col].setPlayer(0);
                        break;
                    }
                }

                this.highlightLastMove(undoneMoves[i + 1] ?? null);
            }
        });

        this.game.on('ended', () => this.endedCallback());
        this.game.on('canceled', () => this.endedCallback());
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
        const { playerSettings } = usePlayerSettingsStore();
        const size = this.game.getSize();

        const boardShadingPattern = playerSettings?.boardShadingPattern ?? null;
        const boardShadingPatternIntensity = playerSettings?.boardShadingPatternIntensity ?? 0.5;
        const boardShadingPatternOption = playerSettings?.boardShadingPatternOption ?? null;
        const show44dots = playerSettings?.show44dots ?? false;
        const shadingPattern = createShadingPattern(boardShadingPattern, size, boardShadingPatternOption);

        this.hexes = Array(size).fill(null).map(() => Array(size));

        for (let row = 0; row < size; ++row) {
            for (let col = 0; col < size; ++col) {
                const hex = new Hex(this.game.getBoard().getCell(row, col), shadingPattern.calc(row, col) * boardShadingPatternIntensity);

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                this.gameContainer.addChild(hex);

                hex.on('pointertap', () => {
                    this.emit('hexClicked', { row, col });
                });
            }
        }

        if (show44dots && size > 9) {
            this.hexes[3][3].showDot();
            this.hexes[3][size - 4].showDot();
            this.hexes[size - 4][3].showDot();
            this.hexes[size - 4][size - 4].showDot();
        }

        this.highlightLastMove();
    }

    /**
     * Shows a dot on game current last played move.
     * For swap move, shows arrows if possible to swap opponent move,
     * or show a "S" to show that last move was swapped.
     *
     * @param {Move} move Override last move to highlight this move instead.
     */
    private highlightLastMove(move: null | Move = null): void
    {
        if (null !== this.lastSimpleMoveHighlighted) {
            const { row, col } = this.lastSimpleMoveHighlighted;
            this.hexes[row][col].setHighlighted(false);
            this.lastSimpleMoveHighlighted = null;
        }

        this.showSwapable(false);
        this.showSwaped(false);

        const lastMove = move ?? this.game.getLastMove();

        if (null === lastMove) {
            return;
        }

        if (this.game.canSwapNow()) {
            this.showSwapable(lastMove);
            return;
        }

        if ('swap-pieces' === lastMove.getSpecialMoveType()) {
            const { mirror } = this.getSwapCoordsFromGameOrUndoneMoves();
            this.showSwaped(mirror);
            return;
        }

        this.lastSimpleMoveHighlighted = lastMove;
        this.hexes[lastMove.row][lastMove.col].setHighlighted();
    }

    private createColoredSides(): Container
    {
        // Initialize both sides at class level to change them later (light on/off)
        this.sidesGraphics = [new Graphics(), new Graphics()];

        let g: Graphics;
        const to = (a: PointData, b: PointData = { x: 0, y: 0 }) => g.lineTo(a.x + b.x, a.y + b.y);
        const m = (a: PointData, b: PointData = { x: 0, y: 0 }) => g.moveTo(a.x + b.x, a.y + b.y);

        // Set sides colors
        this.sidesGraphics[0].setStrokeStyle({ width: Hex.RADIUS * 0.6, color: GameView.currentTheme.colorA });
        this.sidesGraphics[1].setStrokeStyle({ width: Hex.RADIUS * 0.6, color: GameView.currentTheme.colorB });

        // From a1 to i1 (red)
        g = this.sidesGraphics[0];
        g.moveTo(Hex.cornerCoords(5).x, Hex.cornerCoords(5).y);

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(5));
            to(Hex.coords(0, i), Hex.cornerCoords(0));
        }

        g.stroke();

        // From i1 to i9 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(0, this.game.getSize() - 1), Hex.cornerCoords(0));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(1));
            to(Hex.coords(i, this.game.getSize() - 1), Hex.cornerCoords(2));
        }

        g.stroke();

        // From i9 to a9 (red)
        g = this.sidesGraphics[0];
        m(Hex.coords(this.game.getSize() - 1, this.game.getSize() - 1), Hex.cornerCoords(2));

        for (let i = 0; i < this.game.getSize(); ++i) {
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(3));
            to(Hex.coords(this.game.getSize() - 1, this.game.getSize() - i - 1), Hex.cornerCoords(4));
        }

        g.stroke();

        // From a9 to a1 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(this.game.getSize() - 1, 0), Hex.cornerCoords(4));

        for (let i = 0; i < this.game.getSize(); ++i) {
            if (i) to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(4));
            to(Hex.coords(this.game.getSize() - i - 1, 0), Hex.cornerCoords(5));
        }

        g.stroke();

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
            fill: GameView.currentTheme.textColor,
        });

        const createText = (string: string, x: number, y: number): Text => {
            const text = new Text({ text: string, style: coordsTextStyle });

            text.resolution = window.devicePixelRatio * 2;
            text.rotation = -this.gameContainer.rotation;
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
        if (this.game.isCanceled()) {
            this.highlightSides(true, true);
            return;
        }

        if (!this.game.isEnded()) {
            this.highlightSideForPlayer(this.game.getCurrentPlayerIndex());
            return;
        }

        this.highlightSideForPlayer(this.game.getStrictWinner());
    }

    /**
     * Returns opposite of board rotation to keep the top at the top,
     * but fixes cases where cells are pointy-top oriented by removing PI/6 radians.
     */
    private fixedRotation(): number
    {
        return -ceil(((this.gameContainer.rotation / PI_6) + 1) / 2) * PI_3 + PI_6;
    }

    private createSwapable(): SwapableSprite
    {
        const swapable = new SwapableSprite();

        swapable.rotation = this.fixedRotation();
        swapable.visible = false;

        return swapable;
    }

    private createSwaped(): SwapedSprite
    {
        const swaped = new SwapedSprite();

        swaped.rotation = -this.gameContainer.rotation;
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

    previewMove(move: Move, playerIndex: PlayerIndex): this
    {
        if (null !== this.previewedMove && !this.previewedMove.move.sameAs(move)) {
            this.removePreviewMove();
        }

        this.previewedMove = { move, playerIndex };

        switch (move.getSpecialMoveType()) {
            case undefined:
                this.hexes[move.row][move.col].previewMove(playerIndex);
                break;

            case 'swap-pieces': {
                const swapCoords = this.game.getSwapCoords(false);

                if (null === swapCoords) {
                    throw new Error('Unexpected null swapCoords');
                }

                const { mirror, swapped } = swapCoords;

                this.hexes[swapped.row][swapped.col].previewMove(1 - playerIndex as PlayerIndex);
                this.hexes[mirror.row][mirror.col].previewMove(playerIndex);
            }
        }

        return this;
    }

    removePreviewMove(undoneMoves: null | Move[] = null): this
    {
        if (null === this.previewedMove) {
            return this;
        }

        const { move } = this.previewedMove;
        this.previewedMove = null;

        switch (move.getSpecialMoveType()) {
            case undefined:
                this.hexes[move.row][move.col].removePreviewMove();
                break;

            case 'swap-pieces': {
                const { mirror, swapped } = this.getSwapCoordsFromGameOrUndoneMoves(undoneMoves);

                this.hexes[swapped.row][swapped.col].removePreviewMove();
                this.hexes[mirror.row][mirror.col].removePreviewMove();
            }
        }

        return this;
    }

    destroy(): void
    {
        this.pixi.destroy(true);

        this.destroyResizeObserver();
        this.unwatchThemeSwitchedListener();
        this.unwatchSettingsChangedListener();
        this.unwatchLocalSettingsChangedListener();
    }
}
