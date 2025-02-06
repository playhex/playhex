import { Game, Move, PlayerIndex, Coords } from '../game-engine';
import { Application, Container, Graphics, PointData, Text, TextStyle } from 'pixi.js';
import Hex from './Hex';
import { Theme, themes } from './BoardTheme';
import { TypedEmitter } from 'tiny-typed-emitter';
import SwapableSprite from './SwapableSprite';
import SwapedSprite from './SwapedSprite';
import { createShadingPattern, ShadingPatternType } from './shading-patterns';
import { ResizeObserverDebounced } from '../resize-observer-debounced/ResizeObserverDebounced';
import { Mark } from './Mark';
import TextMark from './marks/TextMark';

const { min, max, sin, cos, sqrt, ceil, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

export type OrientationMode = 'landscape' | 'portrait';

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
     * A hex has been clicked in simulation mode on the view.
     *
     * @param played Whether the move has been simulated and added to simulated moves stack,
     *               or just clicked because cell is already occupied by another simulation move.
     *               Event is not emitted when clicking on an already played cell.
     */
    hexSimulated: (move: Move, played: boolean) => void;

    /**
     * Game has ended, and win animation is over.
     * Used to display win message after animation, and not at same time.
     */
    endedAndWinAnimationOver: () => void;

    orientationChanged: () => void;

    movesHistoryCursorChanged: (cursor: null | number) => void;

    /**
     * Simulation mode has been enabled or disabled.
     */
    simulationModeChanged: (enabled: boolean) => void;
};

const defer = () => {
    let resolve!: () => void;
    let reject!: (reason: Error) => void;

    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

type GameViewOptions = {
    /**
     * Theme/colors used to display board
     */
    theme: Theme;

    /**
     * Whether to show cell coords around the board
     */
    displayCoords: boolean;

    /**
     * Preferred orientations when game view is sized in landscape or portrait
     */
    preferredOrientations: PreferredOrientations;

    /**
     * Let "auto" to adapt board orientation depending on container ratio.
     * Or set "landscape" or "portrait" to force displaying in this mode.
     */
    selectedBoardOrientationMode: 'auto' | OrientationMode;

    /**
     * Whether to show "anchors" on 4-4 cells.
     * Only for size > 9.
     */
    show44dots: boolean;

    shadingPatternType: ShadingPatternType;
    shadingPatternOption: unknown;
    shadingPatternIntensity: number;
};

const defaultOptions: GameViewOptions = {
    theme: themes.dark,
    displayCoords: false,
    preferredOrientations: {
        landscape: 11, // Diamond
        portrait: 9, // Vertical flat
    },
    selectedBoardOrientationMode: 'auto',
    show44dots: false,
    shadingPatternType: null,
    shadingPatternIntensity: 0.5,
    shadingPatternOption: null,
};

/**
 * Generates a pixi application to show a Hex board and position from a game.
 *
 * GameView should not be a vue ref, it caused performance issues, more especially when calling .mount() on gameView.value
 * Also experienced crashes when toggling coords.
 *
 * Memory leaks: to check for memory leak,
 * put `redraw()` in a loop (i.e `setInterval(() => this.redraw(), 20)`),
 * open a game to create a GameView,
 * check memory used, then create a snapshot after few seconds (no need to exceed 400Mb).
 * In chrome, Summary, check for known pixi classes that take more space.
 */
export default class GameView extends TypedEmitter<GameViewEvents>
{
    static MARKS_GROUP_DEFAULT = '_default';
    static MARKS_GROUP_SIMULATION = '_simulation';

    private options: GameViewOptions;

    private containerElement: null | HTMLElement = null;
    private initialized = false;

    private hexes: Hex[][] = [];
    private pixi: Application;
    private gameContainer: Container = new Container();

    private currentOrientation: number;

    private sidesGraphics: [Graphics, Graphics];

    private lastSimpleMoveHighlighted: null | Coords = null;
    private swapable: SwapableSprite;
    private swaped: SwapedSprite;

    private previewedMove: null | { move: Move, playerIndex: PlayerIndex } = null;

    /**
     * When enabled, moves are no longer played, but instead stacked in simulatedMoves.
     * They will be displayed temporarily only, until simulation mode is disabled.
     */
    private simulationMode = false;

    /**
     * Simulation moves played so far.
     */
    private simulatedMoves: { move: string, byPlayerIndex: PlayerIndex }[] = [];

    /**
     * From which color play simulation moves.
     * null: default, play next color after last played move
     * 0 or 1: first simulated move is red or blue.
     */
    private simulationMoveFromPlayerIndex: null | PlayerIndex = null;

    /**
     * Show an earlier position on the board.
     * - `null`: show current position
     * - `0`: show first move
     * - `-1`: show empty board
     */
    private movesHistoryCursor: null | number = null;

    /**
     * Listener for keyboard event to control moves history cursor
     */
    private keyboardEventListener: null | ((event: KeyboardEvent) => void) = null;

    private resizeObserver: null | ResizeObserver = null;

    private initPromise = defer();

    private marksContainer = new Container();
    private marks: { [group: string]: Mark[] } = {};

    constructor(
        private game: Game,
        options: Partial<GameViewOptions> = {},
    ) {
        super();

        this.options = {
            ...defaultOptions,
            ...options,
        };
    }

    private async doMount(element: HTMLElement): Promise<void>
    {
        if (null !== this.containerElement) {
            throw new Error('GameView already mounted.');
        }

        this.containerElement = element;

        this.pixi = new Application();

        await this.pixi.init({
            antialias: true,
            backgroundAlpha: 0,
            resolution: ceil(window.devicePixelRatio), // passing devicePixelRatio * 2 here, and no longer need to double resolution of PIXI.Text
            autoDensity: true,
            resizeTo: element,
            ...this.getWrapperSize(),
        });

        this.listenContainerElementResize(element);

        this.pixi.stage.addChild(this.gameContainer);

        this.redraw();
        this.listenModel();

        element.appendChild(this.getView());
    }

    /**
     * Mount the gameView on an element.
     * Will initialize pixi app, draw it, and append canvas to element.
     *
     * NEVER call mount() on a vue ref, it is very laggy.
     *
     * I.e don't do:
     * ```
     *      gameViewRef.value.mount();
     * ```
     * do:
     * ```
     *      gameViewRef.value = gameView;
     *      gameView.mount();
     * ```
     *
     * @param element Element in which this gameView should fit.
     * Game view will then auto fit when element size changes.
     * Element should be fixed size.
     *
     * @returns Promise that resolves when application is initialized.
     */
    async mount(element: HTMLElement): Promise<void>
    {
        try {
            await this.doMount(element);
            this.initPromise.resolve();
            this.initialized = true;
        } catch (e) {
            this.initPromise.reject(e);
        }

        return this.ready();
    }

    /**
     * When pixi app created, board drawn, and mounted with `mount()`.
     */
    async ready(): Promise<void>
    {
        return this.initPromise.promise;
    }

    /**
     * Returns which board orientation should be used
     * from game view wrapper ratio, and user preferred orientations for landscape and portrait.
     */
    getComputedBoardOrientationMode(): OrientationMode
    {
        const { selectedBoardOrientationMode: selectedBoardOrientation } = this.options;

        // If "portrait" or "landscape" explicitely selected, returns it
        if ('auto' !== selectedBoardOrientation) {
            return selectedBoardOrientation;
        }

        // If set to auto, returns depending on wrapper ratio
        return this.getWrapperOrientationMode();
    }

    /**
     * Returns which board orientation should be used
     * from game view wrapper ratio, and user preferred orientations for landscape and portrait.
     */
    getComputedBoardOrientation(): number
    {
        const { preferredOrientations } = this.options;

        return preferredOrientations[this.getComputedBoardOrientationMode()];
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

    protected redrawIfInitialized(): void
    {
        if (this.initialized) {
            this.redraw();
        }
    }

    protected redraw(): void
    {
        const wrapperSize = this.getWrapperSize();

        if (null === wrapperSize) {
            throw new Error('Cannot redraw, no wrapper size, seems not yet mounted');
        }

        // Prevent destroying marks recursively
        this.gameContainer.removeChild(this.marksContainer);

        for (const child of this.gameContainer.children) {
            child.destroy(true);
        }

        this.gameContainer.removeChildren();

        this.updateOrientation();

        this.gameContainer.rotation = this.currentOrientation * PI_6;
        this.updateMarksRotation();

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

        if (this.options.displayCoords) {
            this.gameContainer.addChild(this.createCoords());
        }

        this.swapable = this.createSwapable();
        this.swaped = this.createSwaped();

        this.createAndAddHexes();
        this.addAllMoves();
        this.addAllSimulatedMoves();
        this.highlightSidesFromGame();
        this.showPreviewedMove();

        this.gameContainer.addChild(
            this.swapable,
            this.swaped,
            this.marksContainer,
        );
    }

    private resizeRendererAndRedraw(): void
    {
        if (!this.initialized) {
            return;
        }

        const wrapperSize = this.getWrapperSize();

        if (!this.pixi.renderer || null === wrapperSize) {
            throw new Error('Missing renderer or wrapper size');
        }

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

    private listenContainerElementResize(element: HTMLElement): void
    {
        // Resize renderer first when starting listening to element resize
        //this.resizeRendererAndRedraw();

        this.destroyResizeObserver();

        this.resizeObserver = new ResizeObserverDebounced(() => this.resizeRendererAndRedraw());

        this.resizeObserver.observe(element);
    }

    /**
     * Get current size of the dom element that is containing the pixi application.
     * Can be null if not yet mounted.
     */
    private getWrapperSize(): null | GameViewSize
    {
        if (null === this.containerElement) {
            return null;
        }

        const { width, height } = this.containerElement.getBoundingClientRect();

        return { width, height };
    }

    private getWrapperOrientationMode(): OrientationMode
    {
        const wrapperSize = this.getWrapperSize();

        if (null === wrapperSize) {
            return 'landscape';
        }

        return wrapperSize.width > wrapperSize.height
            ? 'landscape'
            : 'portrait'
        ;
    }

    getGame()
    {
        return this.game;
    }

    getView(): HTMLCanvasElement
    {
        return this.pixi.canvas;
    }

    getPreferredOrientations(): PreferredOrientations
    {
        return this.options.preferredOrientations;
    }

    setPreferredOrientations(preferredOrientations: PreferredOrientations): void
    {
        this.options.preferredOrientations = preferredOrientations;
        this.redrawIfInitialized();
    }

    /**
     * Returns current orientation used to display board,
     * in landscape or portrait if configured.
     */
    getCurrentOrientation(): number
    {
        return (this.currentOrientation + 12) % 12;
    }

    getTheme(): Theme
    {
        return this.options.theme;
    }

    setTheme(theme: Theme): void
    {
        this.options.theme = theme;
        this.redrawIfInitialized();
    }

    updateOptions(options: Partial<GameViewOptions>): void
    {
        this.options = {
            ...this.options,
            ...options,
        };

        this.redrawIfInitialized();
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

        if (null === wrapperSize) {
            return;
        }

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
        if (this.options.displayCoords) {
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
            this.addMove(move, byPlayerIndex);
            this.removePreviewedMove();
            this.highlightSidesFromGame();
        });

        this.game.on('undo', async undoneMoves => {
            this.removePreviewedMove(undoneMoves);

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

            this.highlightSidesFromGame();
        });

        this.game.on('ended', () => this.endedCallback());
        this.game.on('canceled', () => this.endedCallback());
    }

    /**
     * Animate winning path if there is one.
     * To be called once all is loaded and board won't redraw anymore
     * (redrawing while animation is running will make the animation incomplete).
     */
    async animateWinningPath(): Promise<void>
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
        if (this.hexes.length > 0) {
            for (const hexRow of this.hexes) {
                for (const hex of hexRow) {
                    hex.destroy(true);
                }
            }

            this.hexes = [];
        }

        const hexesContainer = new Container();
        const size = this.game.getSize();
        const { show44dots, shadingPatternType, shadingPatternIntensity, shadingPatternOption } = this.options;
        const shadingPattern = createShadingPattern(shadingPatternType, size, shadingPatternOption);

        this.hexes = Array(size).fill(null).map(() => Array(size));

        for (let row = 0; row < size; ++row) {
            for (let col = 0; col < size; ++col) {
                const hex = new Hex(
                    this.options.theme,
                    null,
                    shadingPattern.calc(row, col) * shadingPatternIntensity,
                );

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                hexesContainer.addChild(hex);

                hex.on('pointertap', () => {

                    // Disable play in rewind mode. May change when simulation mode is implemented.
                    if (null !== this.movesHistoryCursor) {
                        if (this.movesHistoryCursor !== this.game.getMovesHistory().length - 1) {
                            return;
                        }

                        // In case rewind was already on last move, just disable rewind mode.
                        this.disableRewindMode();
                    }

                    if (!this.simulationMode) {
                        this.emit('hexClicked', { row, col });
                    } else {
                        const move = new Move(row, col);

                        if (this.game.getBoard().isEmpty(move.row, move.col)) {
                            const simulationMoveColor = this.getSimulationMoveColorAt(move);
                            let played = false;

                            if (null === simulationMoveColor) {
                                this.playSimulatedMove(move);
                                played = true;
                            }

                            this.emit('hexSimulated', move, played);
                        }
                    }
                });
            }
        }

        if (show44dots && size > 9) {
            this.hexes[3][3].showDot();
            this.hexes[3][size - 4].showDot();
            this.hexes[size - 4][3].showDot();
            this.hexes[size - 4][size - 4].showDot();
        }

        this.gameContainer.addChild(hexesContainer);
    }

    private unhighlightLastMove(): void
    {
        if (null !== this.lastSimpleMoveHighlighted) {
            const { row, col } = this.lastSimpleMoveHighlighted;
            this.hexes[row][col].setHighlighted(false);
            this.lastSimpleMoveHighlighted = null;
        }

        this.showSwapable(false);
        this.showSwaped(false);
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
        this.unhighlightLastMove();

        const lastMove = move ?? this.game.getLastMove();

        if (null === lastMove) {
            return;
        }

        if (this.game.canSwapNow()) {
            this.showSwapable(lastMove);
            return;
        }

        if ('pass' === lastMove.getSpecialMoveType()) {
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
        this.sidesGraphics[0].setStrokeStyle({ width: Hex.RADIUS * 0.6, color: this.options.theme.colorA });
        this.sidesGraphics[1].setStrokeStyle({ width: Hex.RADIUS * 0.6, color: this.options.theme.colorB });

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
        return this.options.displayCoords;
    }

    setDisplayCoords(visible = true): void
    {
        this.options.displayCoords = visible;
        this.redrawIfInitialized();
    }

    toggleDisplayCoords(): void
    {
        this.setDisplayCoords(!this.options.displayCoords);
    }

    private createCoords(): Container
    {
        const container = new Container();

        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 0.6,
            fill: this.options.theme.textColor,
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

        if (this.game.isEnded()) {
            this.highlightSideForPlayer(this.game.getStrictWinner());
            return;
        }

        this.highlightSideForPlayer(this.game.getCurrentPlayerIndex());
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

    getPreviewedMove(): null | { move: Move, playerIndex: PlayerIndex }
    {
        return this.previewedMove;
    }

    setPreviewedMove(move: Move, playerIndex: PlayerIndex): this
    {
        if (null !== this.previewedMove) {
            if (this.previewedMove.move.sameAs(move) && playerIndex === this.previewedMove.playerIndex) {
                return this;
            }

            this.removePreviewedMove();
        }

        this.previewedMove = { move, playerIndex };

        this.showPreviewedMove();

        return this;
    }

    /**
     * @param undoneMoves In case of a move undo, pass them here so we can which was coords of undone moves to remove preview
     */
    removePreviewedMove(undoneMoves: null | Move[] = null): this
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

    /**
     * Show previewed move from what is set in this.previewedMove
     */
    private showPreviewedMove(): void
    {
        if (null === this.previewedMove) {
            return;
        }

        const { move, playerIndex } = this.previewedMove;

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
    }

    getMovesHistoryCursor(): null | number
    {
        return this.movesHistoryCursor;
    }

    setMovesHistoryCursor(cursor: null | number): void
    {
        if (cursor === this.movesHistoryCursor) {
            return;
        }

        this.movesHistoryCursor = cursor;
        this.boundMovesHistoryCursor();
        this.redrawIfInitialized();
        this.emit('movesHistoryCursorChanged', this.movesHistoryCursor);
    }

    private boundMovesHistoryCursor(): void
    {
        if (null === this.movesHistoryCursor) {
            return;
        }

        if (this.movesHistoryCursor < -1) {
            this.movesHistoryCursor = -1;
            return;
        }

        const { length } = this.getGame().getMovesHistory();

        if (this.movesHistoryCursor >= length) {
            this.movesHistoryCursor = length - 1;
        }
    }

    enableRewindMode(): void
    {
        if (null === this.movesHistoryCursor) {
            this.setMovesHistoryCursor(Infinity);
        }
    }

    disableRewindMode(): void
    {
        if (null !== this.movesHistoryCursor) {
            this.setMovesHistoryCursor(null);
        }
    }

    changeMovesHistoryCursor(delta: number): void
    {
        this.setMovesHistoryCursor((this.movesHistoryCursor ?? this.getGame().getMovesHistory().length - 1) + delta);
    }

    addMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
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

        this.highlightLastMove(); // do not pass move to highlight last played and not simulated move when simulating
    }

    private addAllMoves(): void
    {
        this.unhighlightLastMove();

        const movesHistory = this.game.getMovesHistory();

        for (let i = 0; i < movesHistory.length; ++i) {
            if (null !== this.movesHistoryCursor && i > this.movesHistoryCursor) {
                break;
            }

            this.addMove(movesHistory[i], i % 2 as PlayerIndex);
        }
    }

    isSimulationMode(): boolean
    {
        return this.simulationMode;
    }

    /**
     * Will play next moves temporarily.
     * Moves will be erased when simulation mode disabled.
     */
    enableSimulationMode(fromPlayerIndex: null | PlayerIndex = null): void
    {
        if (this.simulationMode) {
            return;
        }

        this.disableRewindMode();
        this.simulationMode = true;
        this.simulationMoveFromPlayerIndex = fromPlayerIndex;
        this.emit('simulationModeChanged', this.simulationMode);
    }

    disableSimulationMode(): void
    {
        if (!this.simulationMode) {
            return;
        }

        this.simulationMode = false;
        this.simulatedMoves = [];
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        this.redraw();
        this.emit('simulationModeChanged', this.simulationMode);
    }

    getSimulationMoves(): { move: string, byPlayerIndex: PlayerIndex }[]
    {
        return this.simulatedMoves;
    }

    setSimulationMoves(moves: { move: string, byPlayerIndex: PlayerIndex }[]): void
    {
        this.simulatedMoves = moves;
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        this.redraw();
    }

    /**
     * Set simulation moves from a list of moves,
     * color are automatically defined.
     */
    setSimulationMovesAuto(moves: string[]): void
    {
        this.simulatedMoves = [];
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        moves.forEach(move => this.playSimulatedMove(Move.fromString(move)));
        this.redraw();
    }

    /**
     * @param index Number of the simulation move from last played move. Starts from 0.
     */
    private addSimulatedMove(move: string, byPlayerIndex: PlayerIndex, index: number): void
    {
        const moveInstance = Move.fromString(move);

        this.addMove(moveInstance, byPlayerIndex);
        this.addMark(new TextMark('' + (index + 1)).setCoords(moveInstance), GameView.MARKS_GROUP_SIMULATION);
    }

    private addAllSimulatedMoves(): void
    {
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        this.simulatedMoves.forEach(({ move, byPlayerIndex }, index) => this.addSimulatedMove(move, byPlayerIndex, index));
    }

    /**
     * Returns color of next simulation move,
     * automatically guessed by last move.
     */
    private getNextAutoSimulationColor(): PlayerIndex
    {
        // returns next color than last simulated move color
        if (this.simulatedMoves.length > 0) {
            return 1 - this.simulatedMoves[this.simulatedMoves.length - 1].byPlayerIndex as PlayerIndex;
        }

        // if no simulation moves yet, returns simulationMoveFromPlayerIndex if defined
        if (null !== this.simulationMoveFromPlayerIndex) {
            return this.simulationMoveFromPlayerIndex;
        }

        // else return next player index from game
        return 1 - this.game.getCurrentPlayerIndex() as PlayerIndex;
    }

    /**
     * Play a simulation move.
     *
     * @param byPlayerIndex Which color. Let null for auto: will play colors alternately,
     *                      depending on how much move are played already.
     */
    playSimulatedMove(move: Move, byPlayerIndex: null | PlayerIndex = null): void
    {
        if (null === byPlayerIndex) {
            byPlayerIndex = this.getNextAutoSimulationColor();
        }

        this.simulatedMoves.push({ move: move.toString(), byPlayerIndex });
        this.addSimulatedMove(move.toString(), byPlayerIndex, this.simulatedMoves.length - 1);
    }

    getSimulationMoveColorAt(coords: Coords): null | PlayerIndex
    {
        for (const { move, byPlayerIndex } of this.simulatedMoves) {
            const { row, col } = Move.fromString(move);

            if (coords.row === row && coords.col === col) {
                return byPlayerIndex;
            }
        }

        return null;
    }

    clearSimulationMoves(): void
    {
        this.simulatedMoves = [];
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        this.redraw();
    }

    listenArrowKeys(): void
    {
        if (null !== this.keyboardEventListener) {
            return;
        }

        this.keyboardEventListener = event => {
            if ((event.target as HTMLElement | null)?.nodeName === 'INPUT')
                return;
            switch (event.key) {
                case 'ArrowLeft':
                    if (!this.simulationMode) {
                        this.changeMovesHistoryCursor(-1);
                    }
                    break;

                case 'ArrowRight':
                    if (!this.simulationMode) {
                        this.changeMovesHistoryCursor(+1);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', this.keyboardEventListener);
    }

    unlistenArrowKeys(): void
    {
        if (null === this.keyboardEventListener) {
            return;
        }

        window.removeEventListener('keydown', this.keyboardEventListener);
        this.keyboardEventListener = null;
    }

    addMark(mark: Mark, group: string = GameView.MARKS_GROUP_DEFAULT): void
    {
        if (undefined === this.marks[group]) {
            this.marks[group] = [];
        }

        mark.initOnce();
        mark.updateRotation(this.gameContainer.rotation);

        this.marks[group].push(mark);
        this.marksContainer.addChild(mark);
    }

    removeMark(mark: Mark): void
    {
        this.marksContainer.removeChild(mark);

        for (const group in this.marks) {
            this.marks[group] = this.marks[group].filter(m => m !== mark);
        }
    }

    removeMarks(group: null | string = null): void
    {
        if (null !== group) {
            if (undefined === this.marks[group]) {
                return;
            }

            this.marksContainer.removeChild(...this.marks[group]);
            this.marks[group] = [];

            return;
        }

        this.marksContainer.removeChildren();
        this.marks = {};
    }

    private updateMarksRotation(): void
    {
        for (const group in this.marks) {
            for (const mark of this.marks[group]) {
                mark.updateRotation(this.gameContainer.rotation);
            }
        }
    }

    destroy(): void
    {
        this.pixi.destroy(true);

        this.destroyResizeObserver();
        this.unlistenArrowKeys();
    }
}
