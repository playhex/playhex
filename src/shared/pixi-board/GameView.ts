import { Application, Container, Graphics, PointData, Text, TextStyle } from 'pixi.js';
import Hex from './Hex.js';
import { Theme, themes } from './BoardTheme.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import SwappableMark from './marks/SwappableMark.js';
import SwappedMark from './marks/SwappedMark.js';
import { createShadingPattern, ShadingPatternType } from './shading-patterns.js';
import { ResizeObserverDebounced } from '../resize-observer-debounced/ResizeObserverDebounced.js';
import { Mark } from './Mark.js';
import TextMark from './marks/TextMark.js';
import { colToLetter, Coords, coordsToMove, mirrorMove, Move, moveToCoords, rowToNumber } from '../move-notation/move-notation.js';

const { min, max, sin, cos, sqrt, ceil, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

type PlayerIndex = 0 | 1;

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
    hexClicked: (move: Move) => void;

    /**
     * A hex has been clicked on the view, as secondary action: long pressed or ctrl clicked.
     * Can be used to make some secondary actions.
     */
    hexClickedSecondary: (move: Move) => void;

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
    /**
     * Name of marks group used when no group passed
     */
    static MARKS_GROUP_DEFAULT = '_default';

    /**
     * Name of marks group used for simulation moves
     */
    static MARKS_GROUP_SIMULATION = '_simulation';

    /**
     * Name of marks group used for swappable and swapped
     */
    static MARKS_GROUP_SWAP = '_swap';

    private options: GameViewOptions;

    private containerElement: null | HTMLElement = null;
    private initialized = false;

    private hexes: Hex[][] = [];
    private pixi: Application;
    private gameContainer: Container = new Container();

    private currentOrientation: number;

    private sidesGraphics: [Graphics, Graphics];

    private lastSimpleMoveHighlighted: null | Coords = null;

    private previewedMove: null | { move: Move, playerIndex: PlayerIndex } = null;

    /**
     * When enabled, moves are no longer played, but instead stacked in simulatedMoves.
     * They will be displayed temporarily only, until simulation mode is disabled.
     */
    private simulationMode = false;

    /**
     * Simulation moves played so far.
     */
    private simulatedMoves: { move: Move, byPlayerIndex: PlayerIndex }[] = [];

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

    /**
     * Long press handling, to make secondary action available on mobile.
     *
     * Starts when pointer down,
     * cleared when pointer up too quickly, or secondary action triggered.
     */
    private longPressTimeout: null | NodeJS.Timeout = null;

    /**
     * How much milliseconds need to hold to trigger secondary action.
     */
    private longPressDelay = 700;

    /**
     * Flag to prevent trigger both hexClicked and hexClickedSecondary.
     */
    private longPressed = false;

    private marksContainer = new Container();
    private marks: { [group: string]: Mark[] } = {};

    constructor(
        private boardsize: number,
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
        if (this.containerElement !== null) {
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

    getHex(move: Move): Hex
    {
        if (move === 'swap-pieces' || move === 'pass') {
            throw new Error('Cannot getHex with swap or pass');
        }

        const { row, col } = moveToCoords(move);

        return this.hexes[row][col];
    }

    setHex(move: Move, hex: Hex): void
    {
        if (move === 'swap-pieces' || move === 'pass') {
            throw new Error('Cannot getHex with swap or pass');
        }

        const { row, col } = moveToCoords(move);

        this.hexes[row][col] = hex;
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
    ready(): Promise<void>
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
        if (selectedBoardOrientation !== 'auto') {
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

        if (wrapperSize === null) {
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
            this.boardsize / 2 - 0.5,
            this.boardsize / 2 - 0.5,
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

        this.createAndAddHexes();
        this.addAllMoves();
        this.addAllSimulatedMoves();
        this.highlightSidesFromGame();
        this.showPreviewedMove();

        this.gameContainer.addChild(
            this.marksContainer,
        );
    }

    private resizeRendererAndRedraw(): void
    {
        if (!this.initialized) {
            return;
        }

        const wrapperSize = this.getWrapperSize();

        if (!this.pixi.renderer || wrapperSize === null) {
            throw new Error('Missing renderer or wrapper size');
        }

        this.pixi.renderer.resize(wrapperSize.width, wrapperSize.height);
        this.redraw();
    }

    private destroyResizeObserver(): void
    {
        if (this.resizeObserver !== null) {
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
        if (this.containerElement === null) {
            return null;
        }

        const { width, height } = this.containerElement.getBoundingClientRect();

        return { width, height };
    }

    private getWrapperOrientationMode(): OrientationMode
    {
        const wrapperSize = this.getWrapperSize();

        if (wrapperSize === null) {
            return 'landscape';
        }

        return wrapperSize.width > wrapperSize.height
            ? 'landscape'
            : 'portrait'
        ;
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

        const boardHeight = Hex.RADIUS * this.boardsize * 1.5 - 0.5;
        const boardWidth = Hex.RADIUS * this.boardsize * SQRT_3_2;
        const wrapperSize = this.getWrapperSize();

        if (wrapperSize === null) {
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
    private getSwapCoordsFromGameOrUndoneMoves(undoneMoves: null | Move[] = null): { swapped: Move, mirror: Move }
    {
        const swapCoords = this.game.getSwapCoords(false);

        if (swapCoords) {
            return swapCoords;
        }

        if (undoneMoves === null) {
            throw new Error('Cannot get swap coords from game: no swap move, or has been undone but no undoneMoves provided.');
        }

        let firstMove: null | Move = null;

        for (let i = 0; i < undoneMoves.length; ++i) {
            if (undoneMoves[i] === 'swap-pieces') {
                firstMove = undoneMoves[i + 1] ?? null;
            }
        }

        if (!firstMove) {
            throw new Error('Expected to have at least swap coords from game, or first move before swap move in undoneMoves');
        }

        return {
            mirror: mirrorMove(firstMove),
            swapped: firstMove,
        };
    }

    private listenModel(): void
    {
        this.highlightSidesFromGame();

        this.game.on('played', (move, moveIndex, byPlayerIndex) => {
            this.addMove(move.move, byPlayerIndex);
            this.removePreviewedMove();
            this.highlightSidesFromGame();
        });

        this.game.on('undo', async undoneMovesTimestamped => {
            const undoneMoves = undoneMovesTimestamped.map(timestampedMove => timestampedMove.move);

            this.removePreviewedMove(undoneMoves);

            for (let i = 0; i < undoneMoves.length; ++i) {
                const move = undoneMoves[i];

                if (i > 0) {
                    // If two moves are undone, slightly wait between these two moves removal
                    await new Promise(r => setTimeout(r, 150));
                }

                switch (move) {
                    case 'pass':
                        break;

                    case 'swap-pieces': {
                        const { mirror, swapped } = this.getSwapCoordsFromGameOrUndoneMoves(undoneMoves);

                        this.getHex(mirror).setPlayer(null);
                        this.getHex(swapped).setPlayer(0);

                        break;
                    }

                    default:
                        this.getHex(move).setPlayer(null);
                }

                this.highlightLastMove(undoneMoves[i + 1] ?? null);
            }

            this.highlightSidesFromGame();
        });

        this.game.on('ended', () => this.endedCallback());
        this.game.on('canceled', () => this.endedCallback());

        this.game.on('updated', () => {
            this.redraw();
        });
    }

    /**
     * Animate winning path if there is one.
     * To be called once all is loaded and board won't redraw anymore
     * (redrawing while animation is running will make the animation incomplete).
     */
    async animateWinningPath(): Promise<void>
    {
        const winningPath = this.game.getBoard().getShortestWinningPath();

        if (winningPath === null) {
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

    private clearLongPressTimeout(): void
    {
        if (!this.longPressTimeout) {
            return;
        }

        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
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
        const size = this.boardsize;
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

                hex.on('touchstart', () => {
                    this.longPressTimeout = setTimeout(() => {
                        this.emit('hexClickedSecondary', coordsToMove({ row, col }));
                        this.longPressed = true;
                        this.clearLongPressTimeout();
                    }, this.longPressDelay);
                });

                hex.on('touchend', () => this.clearLongPressTimeout());

                hex.on('pointertap', e => {

                    if (this.longPressed) {
                        this.longPressed = false;
                        return;
                    }

                    // ctrl + click: emits hexClickedSecondary instead
                    if (e.ctrlKey) {
                        this.emit('hexClickedSecondary', coordsToMove({ row, col }));
                        return;
                    }

                    // Disable play in rewind mode. May change when simulation mode is implemented.
                    if (this.movesHistoryCursor !== null) {
                        if (this.movesHistoryCursor !== this.game.getMovesHistory().length - 1) {
                            return;
                        }

                        // In case rewind was already on last move, just disable rewind mode.
                        this.disableRewindMode();
                    }

                    if (!this.simulationMode) {
                        this.emit('hexClicked', coordsToMove({ row, col }));
                    } else {
                        const move = coordsToMove({ row, col });

                        if (this.game.getBoard().isEmpty(move)) {
                            const simulationMoveColor = this.getSimulationMoveColorAt(moveToCoords(move));
                            let played = false;

                            if (simulationMoveColor === null) {
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
        if (this.lastSimpleMoveHighlighted !== null) {
            const { row, col } = this.lastSimpleMoveHighlighted;
            this.hexes[row][col].setHighlighted(false);
            this.lastSimpleMoveHighlighted = null;
        }

        this.removeMarks(GameView.MARKS_GROUP_SWAP);
    }

    /**
     * Shows a dot on game current last played move.
     * For swap move, shows arrows if possible to swap opponent move,
     * or show a "S" to show that last move was swapped.
     *
     * @param move Override last move to highlight this move instead.
     */
    private highlightLastMove(move: null | Move = null): void
    {
        this.unhighlightLastMove();

        const lastMove: null | Move = move ?? this.game.getLastMove()?.move ?? null;

        if (lastMove === null) {
            return;
        }

        if (lastMove === 'pass') {
            return;
        }

        if (this.game.canSwapNow() && lastMove !== 'swap-pieces') {
            this.showSwappable(lastMove);
            return;
        }

        if (lastMove === 'swap-pieces') {
            const { mirror } = this.getSwapCoordsFromGameOrUndoneMoves();
            this.showSwapped(mirror);
            return;
        }

        this.lastSimpleMoveHighlighted = moveToCoords(lastMove);
        this.getHex(lastMove).setHighlighted();
    }

    private createColoredSides(): Container
    {
        // Initialize both sides at class level to change them later (light on/off)
        this.sidesGraphics = [new Graphics(), new Graphics()];

        let g: Graphics;
        const to = (a: PointData, b: PointData = { x: 0, y: 0 }, c: PointData = { x: 0, y: 0 }) => g.lineTo(a.x + b.x + c.x, a.y + b.y + c.y);
        const m = (a: PointData, b: PointData = { x: 0, y: 0 }) => g.moveTo(a.x + b.x, a.y + b.y);
        const middle = (a: PointData, b: PointData): PointData => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

        const sideRelativeWidth = 0.35;
        const sideWidth = Hex.RADIUS * sideRelativeWidth;
        const sideDist = Hex.RADIUS * (sideRelativeWidth + 1);
        const { colorA, colorB } = this.options.theme;
        const lastI = this.boardsize - 1;
        const boardMiddle: PointData = middle(Hex.coords(0, 0), Hex.coords(lastI, lastI));

        // Set sides colors
        this.sidesGraphics[0].setStrokeStyle({ width: 0 });
        this.sidesGraphics[0].setFillStyle({ color: colorA });
        this.sidesGraphics[1].setStrokeStyle({ width: 0 });
        this.sidesGraphics[1].setFillStyle({ color: colorB });

        // 1. Top: from a1 to i1 (red)
        g = this.sidesGraphics[0];
        m(Hex.coords(0, 0), Hex.cornerCoords(5, sideDist));

        for (let i = 0; i < lastI; ++i) {
            to(Hex.coords(0, i), Hex.cornerCoords(0, sideDist));
            to(Hex.coords(0, i), Hex.cornerCoords(1), Hex.cornerCoords(0, sideWidth));
        }

        to(Hex.coords(0, lastI), Hex.cornerCoords(0, sideDist));
        to(Hex.coords(0, lastI), middle(Hex.cornerCoords(0, sideDist), Hex.cornerCoords(1, sideDist)));
        to(boardMiddle);

        g.fill();

        // 2. Right: from i1 to i9 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(0, lastI), middle(Hex.cornerCoords(0, sideDist), Hex.cornerCoords(1, sideDist)));

        for (let i = 0; i < lastI; ++i) {
            to(Hex.coords(i, lastI), Hex.cornerCoords(1, sideDist));
            to(Hex.coords(i, lastI), Hex.cornerCoords(2), Hex.cornerCoords(1, sideWidth));
        }

        to(Hex.coords(lastI, lastI), Hex.cornerCoords(1, sideDist));
        to(Hex.coords(lastI, lastI), Hex.cornerCoords(2, sideDist));
        to(boardMiddle);

        g.fill();

        // 3. Bottom: from i9 to a9 (red)
        g = this.sidesGraphics[0];
        m(Hex.coords(lastI, lastI), Hex.cornerCoords(2, sideDist));

        for (let i = lastI; i > 0; --i) {
            to(Hex.coords(lastI, i), Hex.cornerCoords(3, sideDist));
            to(Hex.coords(lastI, i), Hex.cornerCoords(4), Hex.cornerCoords(3, sideWidth));
        }

        to(Hex.coords(lastI, 0), Hex.cornerCoords(3, sideDist));
        to(Hex.coords(lastI, 0), middle(Hex.cornerCoords(3, sideDist), Hex.cornerCoords(4, sideDist)));
        to(boardMiddle);

        g.fill();

        // 4. Left: from a9 to a1 (blue)
        g = this.sidesGraphics[1];
        m(Hex.coords(lastI, 0), middle(Hex.cornerCoords(3, sideDist), Hex.cornerCoords(4, sideDist)));

        for (let i = lastI; i > 0; --i) {
            to(Hex.coords(i, 0), Hex.cornerCoords(4, sideDist));
            to(Hex.coords(i, 0), Hex.cornerCoords(5), Hex.cornerCoords(4, sideWidth));
        }

        to(Hex.coords(0, 0), Hex.cornerCoords(4, sideDist));
        to(Hex.coords(0, 0), Hex.cornerCoords(5, sideDist));
        to(boardMiddle);

        g.fill();

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

        for (let i = 0; i < this.boardsize; ++i) {
            const number = rowToNumber(i);
            container.addChild(createText(number, i, -1));
            container.addChild(createText(number, i, this.boardsize));

            const letter = colToLetter(i);
            container.addChild(createText(letter, -1, i));
            container.addChild(createText(letter, this.boardsize, i));
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
            playerIndex === 0,
            playerIndex === 1,
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

    showSwappable(swappable: Move | null): this
    {
        this.removeMarks(GameView.MARKS_GROUP_SWAP);

        if (!swappable) {
            return this;
        }

        this.addMark(new SwappableMark().setCoords(moveToCoords(swappable)), GameView.MARKS_GROUP_SWAP);

        return this;
    }

    showSwapped(swapped: Move | null): this
    {
        this.removeMarks(GameView.MARKS_GROUP_SWAP);

        if (!swapped) {
            return this;
        }

        this.addMark(new SwappedMark().setCoords(moveToCoords(swapped)), GameView.MARKS_GROUP_SWAP);

        return this;
    }

    hasPreviewedMove(): boolean
    {
        return this.previewedMove !== null;
    }

    getPreviewedMove(): null | { move: Move, playerIndex: PlayerIndex }
    {
        return this.previewedMove;
    }

    setPreviewedMove(move: Move, playerIndex: PlayerIndex): this
    {
        if (this.previewedMove !== null) {
            if (this.previewedMove.move === move && playerIndex === this.previewedMove.playerIndex) {
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
        if (this.previewedMove === null) {
            return this;
        }

        const { move } = this.previewedMove;
        this.previewedMove = null;

        switch (move) {
            case 'swap-pieces': {
                const { mirror, swapped } = this.getSwapCoordsFromGameOrUndoneMoves(undoneMoves);

                this.getHex(swapped).removePreviewMove();
                this.getHex(mirror).removePreviewMove();

                break;
            }

            case 'pass':
                break;

            default:
                this.getHex(move).removePreviewMove();
        }

        return this;
    }

    /**
     * Show previewed move from what is set in this.previewedMove
     */
    private showPreviewedMove(): void
    {
        if (this.previewedMove === null) {
            return;
        }

        const { move, playerIndex } = this.previewedMove;

        switch (move) {
            case 'pass':
                break;

            case 'swap-pieces': {
                const swapCoords = this.game.getSwapCoords(false);

                if (swapCoords === null) {
                    throw new Error('Unexpected null swapCoords');
                }

                const { mirror, swapped } = swapCoords;

                this.getHex(swapped).previewMove(1 - playerIndex as PlayerIndex);
                this.getHex(mirror).previewMove(playerIndex);

                break;
            }

            default:
                this.getHex(move).previewMove(playerIndex);
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
        if (this.movesHistoryCursor === null) {
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
        if (this.movesHistoryCursor === null) {
            this.setMovesHistoryCursor(Infinity);
        }
    }

    disableRewindMode(): void
    {
        if (this.movesHistoryCursor !== null) {
            this.setMovesHistoryCursor(null);
        }
    }

    changeMovesHistoryCursor(delta: number): void
    {
        this.setMovesHistoryCursor((this.movesHistoryCursor ?? this.getGame().getMovesHistory().length - 1) + delta);
    }

    addMove(move: Move, byPlayerIndex: PlayerIndex): void
    {
        switch (move) {
            case 'pass':
                break;

            case 'swap-pieces': {
                const { swapped, mirror } = this.getSwapCoordsFromGameOrUndoneMoves();

                this.getHex(swapped).setPlayer(null);
                this.getHex(mirror).setPlayer(byPlayerIndex);

                break;
            }

            default:
                this.getHex(move).setPlayer(byPlayerIndex);
        }

        this.highlightLastMove(this.simulationMode
            ? null // do not pass move to highlight last played and not simulated move when simulating
            : move,
        );
    }

    private addAllMoves(): void
    {
        this.unhighlightLastMove();

        const movesHistory = this.game.getMovesHistory();

        for (let i = 0; i < movesHistory.length; ++i) {
            if (this.movesHistoryCursor !== null && i > this.movesHistoryCursor) {
                break;
            }

            this.addMove(movesHistory[i].move, i % 2 as PlayerIndex);
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

    getSimulationMoves(): { move: Move, byPlayerIndex: PlayerIndex }[]
    {
        return this.simulatedMoves;
    }

    setSimulationMoves(moves: { move: Move, byPlayerIndex: PlayerIndex }[]): void
    {
        this.simulatedMoves = moves;
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        this.redraw();
    }

    /**
     * Set simulation moves from a list of moves,
     * color are automatically defined.
     */
    setSimulationMovesAuto(moves: Move[]): void
    {
        this.simulatedMoves = [];
        this.removeMarks(GameView.MARKS_GROUP_SIMULATION);
        moves.forEach(move => this.playSimulatedMove(move));
        this.redraw();
    }

    /**
     * @param index Number of the simulation move from last played move. Starts from 0.
     */
    private addSimulatedMove(move: Move, byPlayerIndex: PlayerIndex, index: number): void
    {
        this.addMove(move, byPlayerIndex);
        this.addMark(new TextMark('' + (index + 1)).setCoords(moveToCoords(move)), GameView.MARKS_GROUP_SIMULATION);
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
        if (this.simulationMoveFromPlayerIndex !== null) {
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
        if (byPlayerIndex === null) {
            byPlayerIndex = this.getNextAutoSimulationColor();
        }

        this.simulatedMoves.push({ move, byPlayerIndex });
        this.addSimulatedMove(move, byPlayerIndex, this.simulatedMoves.length - 1);
    }

    getSimulationMoveColorAt(coords: Coords): null | PlayerIndex
    {
        for (const { move, byPlayerIndex } of this.simulatedMoves) {
            const { row, col } = moveToCoords(move);

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
        if (this.keyboardEventListener !== null) {
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
        if (this.keyboardEventListener === null) {
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

    removeMarks(group: string = GameView.MARKS_GROUP_DEFAULT): void
    {
        if (undefined === this.marks[group]) {
            return;
        }

        this.marksContainer.removeChild(...this.marks[group]);
        this.marks[group] = [];
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
