import { Application, Container, Graphics, PointData, Text, TextStyle } from 'pixi.js';
import Hex from './Hex.js';
import { Theme, themes } from './BoardTheme.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { ResizeObserverDebounced } from '../resize-observer-debounced/ResizeObserverDebounced.js';
import { BoardEntity } from './BoardEntity.js';
import { colToLetter, coordsToMove, Move, moveToCoords, rowToNumber } from '../move-notation/move-notation.js';
import Stone from './entities/Stone.js';

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
     * Board orientation changed.
     */
    orientationChanged: () => void;

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
};

const defaultOptions: GameViewOptions = {
    theme: themes.dark,
    displayCoords: false,
    orientation: 11,
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
     * Name of entity group used when no group passed
     */
    static DEFAULT_ENTITY_GROUP = '_default';

    /**
     * Name of entity group used to place stones
     */
    static STONE_ENTITY_GROUP = '_stone';

    /**
     * Theme/colors used to display board
     */
    private theme: Theme;

    /**
     * Whether to show cell coords around the board
     */
    private displayCoords: boolean;

    /**
     * Integer, every PI/6.
     * 0 means positive flat, 11 means diamond (or -1).
     */
    private orientation: number;

    private containerElement: null | HTMLElement = null;

    /**
     * Mounted, pixi app initialized, resize listener added...
     */
    private initialized = false;

    private hexes: Hex[][] = [];

    private pixi: Application;

    /**
     * Root container.
     * Contains board sides, cells, stones, coords.
     * Can be rotated.
     */
    private gameContainer: Container = new Container();

    /**
     * Container that contains coords.
     *
     * Hierarchy:
     *
     * coordsContainer (visible is switched)
     * |- Container (destroyed recursively when redrawn)
     *    |- letters (kept upside)
     */
    private coordsContainer: Container;

    /**
     * All coords letters.
     * Each of them need to be kept upside when board rotates.
     */
    private coordsTexts: Text[] = [];

    private sidesGraphics: [Graphics, Graphics];

    private resizeObserver: null | ResizeObserver = null;

    private initPromise = defer();

    /**
     * Stones indexed by their move.
     */
    private stones: { [move: string]: Stone } = {};

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
     * Objects displayed on the board.
     * Contains layers with label, correspondong to a group of entities.
     * Layers are sorted by zIndex, and can be empty from all entities.
     */
    private entityLayersContainer: Container<Container<BoardEntity>>;

    constructor(
        private boardsize: number,
        options: Partial<GameViewOptions> = {},
    ) {
        super();

        const opts = {
            ...defaultOptions,
            ...options,
        };

        this.theme = opts.theme;
        this.displayCoords = opts.displayCoords;
        this.orientation = this.modOrientation(opts.orientation);

        this.init();
    }

    getBoardsize(): number
    {
        return this.boardsize;
    }

    private init(): void
    {
        this.entityLayersContainer = new Container({
            sortableChildren: true,
        });

        this.setGroupZIndex(GameView.STONE_ENTITY_GROUP, -10);

        this.gameContainer.addChild(
            this.createColoredSides(),
            this.createHexesContainer(),
            this.entityLayersContainer,
            this.coordsContainer = new Container(),
        );

        this.redrawCoords();
    }

    private async doMount(element: HTMLElement): Promise<void>
    {
        if (this.containerElement) {
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

        this.redrawAfterOrientationOrWrapperSizeChanged();

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

    private redrawAfterThemeChanged(): void
    {
        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
                this.hexes[row][col].updateTheme(this.theme);
            }
        }

        this.updateEntitiesTheme();
        this.redrawCoords();
    }

    private redrawAfterOrientationOrWrapperSizeChanged(): void
    {
        if (!this.initialized) {
            return;
        }

        const wrapperSize = this.getWrapperSize();

        if (wrapperSize === null) {
            throw new Error('Cannot redraw, no wrapper size, seems not yet mounted');
        }

        this.gameContainer.rotation = this.orientation * PI_6;
        this.updateCoordsTextsOrientation();
        this.updateEntitiesRotation();

        this.gameContainer.pivot = Hex.coords(
            this.boardsize / 2 - 0.5,
            this.boardsize / 2 - 0.5,
        );

        this.gameContainer.position = {
            x: wrapperSize.width / 2,
            y: wrapperSize.height / 2,
        };

        this.autoResize();
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
        this.redrawAfterOrientationOrWrapperSizeChanged();
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
        this.resizeRendererAndRedraw();

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
        return this.orientation;
    }

    setOrientation(orientation: number): void
    {
        this.orientation = this.modOrientation(orientation);

        this.redrawAfterOrientationOrWrapperSizeChanged();

        this.emit('orientationChanged');
    }

    getTheme(): Theme
    {
        return this.theme;
    }

    setTheme(theme: Theme): void
    {
        this.theme = theme;

        this.redrawAfterThemeChanged();
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
        this.hexes = Array(this.boardsize).fill(null).map(() => Array(this.boardsize));

        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
                const hex = new Hex(this.theme);

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
        const { colorA, colorB } = this.theme;
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
        return this.displayCoords;
    }

    setDisplayCoords(visible = true): void
    {
        this.displayCoords = visible;
        this.coordsContainer.visible = visible;
        this.redrawAfterOrientationOrWrapperSizeChanged();
    }

    toggleDisplayCoords(): void
    {
        this.setDisplayCoords(!this.displayCoords);
    }

    /**
     * Draw or redraw coords.
     * Redrawn only when we need to change Text font color,
     * when theme changes.
     */
    private redrawCoords(): void
    {
        this.coordsTexts = [];

        for (const child of this.coordsContainer.removeChildren()) {
            child.destroy();
        }

        this.coordsContainer.visible = this.displayCoords;

        const container = new Container();

        const coordsTextStyle = new TextStyle({
            fontFamily: 'Arial',
            fontSize: Hex.RADIUS * 0.6,
            fill: this.theme.textColor,
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

        this.coordsContainer.addChild(container);
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

    getStone(move: Move): null | Stone
    {
        if (move === 'pass' || move === 'swap-pieces') {
            throw new Error('Cannot setStone with move "swap-pieces" or "pass"');
        }

        return this.stones[move] ?? null;
    }

    setStone(move: Move, byPlayerIndex: null | 0 | 1, faded = false): void
    {
        if (move === 'pass' || move === 'swap-pieces') {
            throw new Error('Cannot setStone with move "swap-pieces" or "pass"');
        }

        if (this.stones[move]) {
            this.removeEntity(this.stones[move]);
            delete this.stones[move];
        }

        if (byPlayerIndex !== null) {
            this.stones[move] = new Stone(byPlayerIndex, faded);
            this.stones[move].setCoords(moveToCoords(move));
            this.addEntity(this.stones[move], GameView.STONE_ENTITY_GROUP);
        }
    }

    getGroup(group: string): Container<BoardEntity>
    {
        let layer = this.entityLayersContainer.getChildByLabel(group) as Container<BoardEntity>;

        if (!layer) {
            layer = new Container<BoardEntity>({ label: group });
            this.entityLayersContainer.addChild(layer);
        }

        return layer;
    }

    setGroupZIndex(group: string, zIndex: number): void
    {
        this.getGroup(group).zIndex = zIndex;
    }

    setGroupZIndexBehindStones(group: string): void
    {
        this.setGroupZIndex(group, -20);
    }

    addEntity(entity: BoardEntity, group: string = GameView.DEFAULT_ENTITY_GROUP): void
    {
        entity.initOnce(this.theme);
        entity.updateRotation(this.gameContainer.rotation);

        this.getGroup(group).addChild(entity);
    }

    /**
     * Removes an entity.
     */
    removeEntity(entity: BoardEntity): void
    {
        entity.removeFromParent();
    }

    clearEntitiesGroup(group: string = GameView.DEFAULT_ENTITY_GROUP): void
    {
        const layer = this.entityLayersContainer.getChildByLabel(group);

        if (!layer) {
            return;
        }

        layer.removeChildren();
    }

    /**
     * For entities that need to be kept upside (like letters),
     * or needs to change between hex flat-top/pointy-top,
     * we need to update their rotation after board rotation changed.
     */
    private updateEntitiesRotation(): void
    {
        for (const layer of this.entityLayersContainer.children) {
            for (const entity of layer.children) {
                entity.updateRotation(this.gameContainer.rotation);
            }
        }
    }

    /**
     * Trigger onThemeUpdated() on each entity on this board.
     * Will redraw for them that needs to.
     */
    private updateEntitiesTheme(): void
    {
        for (const layer of this.entityLayersContainer.children) {
            for (const entity of layer.children) {
                entity.onThemeUpdated(this.theme);
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
