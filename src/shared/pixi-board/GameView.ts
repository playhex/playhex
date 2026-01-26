import { Application, Container, Graphics, PointData, Text, TextStyle } from 'pixi.js';
import Hex from './Hex.js';
import { Theme, themes } from './BoardTheme.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { createShadingPattern, ShadingPatternType } from './shading-patterns.js';
import { ResizeObserverDebounced } from '../resize-observer-debounced/ResizeObserverDebounced.js';
import { Mark } from './Mark.js';
import { colToLetter, Coords, coordsToMove, Move, moveToCoords, rowToNumber } from '../move-notation/move-notation.js';
import Anchor44Mark from './marks/Anchor44Mark.js';

const { min, max, sin, cos, sqrt, ceil, PI } = Math;
const SQRT_3_2 = sqrt(3) / 2;
const PI_3 = PI / 3;
const PI_6 = PI / 6;

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

    orientationChanged: () => void;

    movesHistoryCursorChanged: (cursor: null | number) => void;

    /**
     * Simulation mode has been enabled or disabled.
     */
    simulationModeChanged: (enabled: boolean) => void;

    /**
     * This view will be destroyed.
     */
    detroyBefore: () => void;

    /**
     * This view has been destroyed.
     */
    detroyAfter: () => void;
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
     * Integer, every PI/6.
     * 0 means positive flat, 11 means diamond (or -1).
     */
    orientation: number;

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
    orientation: 11,
    show44dots: false,
    shadingPatternType: null,
    shadingPatternIntensity: 0.5,
    shadingPatternOption: null,
};

/**
 * Generates a pixi application to show a Hex board.
 * Responsible for:
 * - showing a hex board
 * - set any position of red/blue stones
 * - display marks on hex cells (swap/swapped, triangle/circle/square mark, ...)
 * - board shadding patterns
 * - semi-transparent stones
 * - themes
 *
 * GameView should not be a vue ref, it caused performance issues, more especially when calling .mount() on gameView.value
 * Also experienced crashes when toggling coords. A shallowRef is ok.
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

    private options: GameViewOptions;

    private containerElement: null | HTMLElement = null;
    private initialized = false;

    private hexes: Hex[][] = [];

    private pixi: Application;
    private gameContainer: Container = new Container();

    private coordsContainer: Container;
    private coordsTexts: Text[] = [];

    private sidesGraphics: [Graphics, Graphics];

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

    /**
     * Marks displayed on top of stone, so always visible.
     * Used to show both a stone or an empty cell.
     * Default.
     */
    private marksForegroundContainer: Container;

    /**
     * Marks displayed behind stone, on the board.
     * Will be hidden, or overriden when a stone is played on the cell.
     * Used for board pattern (e.g 4-4 dots),
     * or may be used for UI purpose,
     * or when a mark is no longer relevant once a stone is played.
     */
    private marksBackgroundContainer: Container;

    /**
     * Marks grouped by groups.
     * Use groups to remove only marks added to a given group.
     */
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

        this.init();
    }

    private init(): void
    {
        this.marksBackgroundContainer = new Container();
        this.marksForegroundContainer = new Container();

        this.gameContainer.addChild(
            this.createColoredSides(),
            this.createHexesContainer(),
            this.marksBackgroundContainer,
            this.coordsContainer = this.createCoords(),
            this.marksForegroundContainer,
        );
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
     * Update after options changed, container resized or rotated...
     */
    redraw(): void
    {
        if (!this.initialized) {
            return;
        }

        const wrapperSize = this.getWrapperSize();

        if (wrapperSize === null) {
            throw new Error('Cannot redraw, no wrapper size, seems not yet mounted');
        }

        this.gameContainer.rotation = this.options.orientation * PI_6;
        this.updateCoordsTextsOrientation();
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

        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
                this.hexes[row][col].updateTheme(this.options.theme);
            }
        }

        this.coordsContainer.visible = this.options.displayCoords;
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

    getView(): HTMLCanvasElement
    {
        return this.pixi.canvas;
    }

    private modOrientation(orientation: number): number
    {
        return ((orientation % 12) + 12) % 12;
    }

    getOrientation(): number
    {
        return this.modOrientation(this.options.orientation);
    }

    setOrientation(orientation: number): void
    {
        this.updateOptions({ orientation });
    }

    getTheme(): Theme
    {
        return this.options.theme;
    }

    setTheme(theme: Theme): void
    {
        this.updateOptions({ theme });
    }

    updateOptions(options: Partial<GameViewOptions>): void
    {
        this.options = {
            ...this.options,
            ...options,
        };

        this.redraw();
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
        if ([1, 2, 3].includes(this.getOrientation() % 6)) {
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

    /**
     * Animate a cell.
     * Animate the stone if any.
     *
     * @param move Which cell to animate (ex: "d4")
     * @param delay In milliseconds, wait before animate
     */
    async animateCell(coords: Move | Coords, delay = 0): Promise<void>
    {
        if (typeof coords === 'string') {
            coords = moveToCoords(coords);
        }

        const { row, col } = coords;

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        await this.hexes[row][col].animate();
    }

    private clearLongPressTimeout(): void
    {
        if (!this.longPressTimeout) {
            return;
        }

        clearTimeout(this.longPressTimeout);
        this.longPressTimeout = null;
    }

    private createHexesContainer(): Container
    {
        const hexesContainer = new Container();
        const { show44dots, shadingPatternType, shadingPatternIntensity, shadingPatternOption } = this.options;
        const shadingPattern = createShadingPattern(shadingPatternType, this.boardsize, shadingPatternOption);

        this.hexes = Array(this.boardsize).fill(null).map(() => Array(this.boardsize));

        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
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

                    this.emit('hexClicked', coordsToMove({ row, col }));
                });
            }
        }

        if (show44dots && this.boardsize > 9) {
            this.addMark(new Anchor44Mark(this.options.theme.textColor).setCoords({ row: 3, col: 3 }), '_group44', 'background');
            this.addMark(new Anchor44Mark(this.options.theme.textColor).setCoords({ row: 3, col: this.boardsize - 4 }), '_group44', 'background');
            this.addMark(new Anchor44Mark(this.options.theme.textColor).setCoords({ row: this.boardsize - 4, col: this.boardsize - 4 }), '_group44', 'background');
            this.addMark(new Anchor44Mark(this.options.theme.textColor).setCoords({ row: this.boardsize - 4, col: 3 }), '_group44', 'background');
        }

        return hexesContainer;
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
        this.redraw();
    }

    toggleDisplayCoords(): void
    {
        this.setDisplayCoords(!this.options.displayCoords);
    }

    private createCoords(): Container
    {
        if (this.coordsTexts.length > 0) {
            throw new Error('Coords Texts already created');
        }

        const container = new Container();

        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 0.6,
            fill: this.options.theme.textColor,
        });

        const createText = (string: string, x: number, y: number): Text => {
            const text = new Text({ text: string, style: coordsTextStyle });

            text.resolution = window.devicePixelRatio * 2;
            text.anchor.set(0.5, 0.5);

            const hexCoords = Hex.coords(x, y);
            text.position.set(hexCoords.x, hexCoords.y);

            this.coordsTexts.push(text);

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

        this.updateCoordsTextsOrientation();

        return container;
    }

    private updateCoordsTextsOrientation(): void
    {
        for (const text of this.coordsTexts) {
            text.rotation = -this.gameContainer.rotation;
        }
    }

    highlightSides(red: boolean, blue: boolean): void
    {
        this.sidesGraphics[0].alpha = red ? 1 : 0.25;
        this.sidesGraphics[1].alpha = blue ? 1 : 0.25;
    }

    highlightSideForPlayer(playerIndex: 0 | 1): void
    {
        this.highlightSides(
            playerIndex === 0,
            playerIndex === 1,
        );
    }

    setStone(move: Move, byPlayerIndex: null | 0 | 1, faded = false): void
    {
        if (move === 'pass') {
            return;
        }

        if (move === 'swap-pieces') {
            throw new Error('Cannot setStone with move "swap-pieces"');
        }

        this.getHex(move).setStone(byPlayerIndex, faded);
    }

    addMark(mark: Mark, group: string = GameView.MARKS_GROUP_DEFAULT, position: 'foreground' | 'background' = 'foreground'): void
    {
        if (undefined === this.marks[group]) {
            this.marks[group] = [];
        }

        mark.initOnce();
        mark.updateRotation(this.gameContainer.rotation);

        this.marks[group].push(mark);

        if (position === 'background') {
            this.marksBackgroundContainer.addChild(mark);
        } else {
            this.marksForegroundContainer.addChild(mark);
        }
    }

    removeMark(mark: Mark): void
    {
        this.marksForegroundContainer.removeChild(mark);
        this.marksBackgroundContainer.removeChild(mark);

        for (const group in this.marks) {
            this.marks[group] = this.marks[group].filter(m => m !== mark);
        }
    }

    removeMarks(group: string = GameView.MARKS_GROUP_DEFAULT): void
    {
        if (undefined === this.marks[group]) {
            return;
        }

        this.marksForegroundContainer.removeChild(...this.marks[group]);
        this.marksBackgroundContainer.removeChild(...this.marks[group]);
        this.marks[group] = [];
    }

    /**
     * For marks that need to be kept upside (like letters),
     * or needs to change between hex flat-top/pointy-top,
     * we need to update their rotation after board rotation changed.
     */
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
        this.emit('detroyBefore');

        this.pixi.destroy(true);

        this.destroyResizeObserver();

        this.emit('detroyAfter');
    }
}
