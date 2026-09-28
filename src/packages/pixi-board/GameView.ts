import { Application, Container } from 'pixi.js';
import Hex from './Hex.js';
import { BoardTheme, BoardView } from './theming/types.js';
import { resolveTheme } from './theming/resolveTheme.js';
import { loadTheme, themeNeedsLoading } from './theming/loadTheme.js';
import { playhexTheme } from './themes/playhex/index.js';
import { textCoords } from './theming/renderers/textCoords.js';
import { TypedEmitter } from 'tiny-typed-emitter';
import { BoardEntity } from './BoardEntity.js';
import Stone from './entities/Stone.js';
import { colToLetter, Coords, coordsToMove, Move, parseMove, rowToNumber } from '@playhex/move-notation';
import { ResizeObserverDebounced } from './resize-observer-debounced/ResizeObserverDebounced.js';

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
     * Pointer pressed down on a hex (fires before hexClicked).
     */
    hexPointerDown: (move: Move) => void;

    /**
     * Pointer moved over a hex (fires during hover or drag).
     */
    hexHovered: (move: Move) => void;

    /**
     * Board orientation changed.
     */
    orientationChanged: () => void;

    /**
     * Board has been resized and redrawn.
     */
    resized: () => void;

    /**
     * GameView has been mounted.
     * Now we know its wrapper size, parent element...
     */
    mounted: () => void;

    /**
     * This view will be destroyed.
     */
    destroyBefore: () => void;

    /**
     * This view has been destroyed.
     */
    destroyAfter: () => void;
};

/**
 * Coords renderer used when theme does not define one.
 */
const defaultCoords = textCoords();

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
     * Theme used to display board.
     * To get light or dark version of a theme, use `resolveTheme()`.
     */
    theme: BoardTheme;

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
     * Whether this view can be clicked and should emit click events.
     * Defaults to true. Set to false when not needed and for better performances.
     */
    interactive: boolean;
};

const defaultOptions: GameViewOptions = {
    theme: resolveTheme(playhexTheme, 'dark'),
    displayCoords: false,
    orientation: 11,
    interactive: true,
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
    static ORIENTATION_DIAMOND = 11;
    static ORIENTATION_FLAT = 0;
    static ORIENTATION_PORTRAIT_FLAT = 9;

    /**
     * Name of entity group used when no group passed
     */
    static DEFAULT_ENTITY_GROUP = '_default';

    /**
     * Name of entity group used to place stones
     */
    static STONE_ENTITY_GROUP = '_stone';

    /**
     * Theme used to display board
     */
    private theme: BoardTheme;

    /**
     * Incremented on each setTheme() call,
     * to ignore a theme loaded after a more recent one has been set.
     */
    private themeVersion = 0;

    /**
     * Whether to show cell coords around the board
     */
    private displayCoords: boolean;

    /**
     * Integer, every PI/6.
     * 0 means positive flat, 11 means diamond (or -1).
     * See GameView.ORIENTATION_* constants for most used values.
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
    private coordsTexts: Container[] = [];

    /**
     * Background of the whole pixi application, drawn by theme.
     * Not rotated nor scaled with the board.
     */
    private backgroundContainer: Container = new Container();

    /**
     * Contains the board drawn by theme.
     */
    private boardContainer: Container = new Container();

    private boardView: BoardView;

    /**
     * Shading of each cell, kept to reapply them when theme changes.
     */
    private cellShadings: number[][];

    /**
     * Whether sides are highlighted, [player1, player2].
     */
    private sidesHighlighted: [boolean, boolean] = [true, true];

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
    private longPressTimeout: null | ReturnType<typeof setTimeout> = null;

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

    private gameViewOptions: GameViewOptions;

    constructor(
        private boardsize: number,
        options: Partial<GameViewOptions> = {},
    ) {
        super();

        this.gameViewOptions = {
            ...defaultOptions,
            ...options,
        };

        this.theme = this.gameViewOptions.theme;
        this.displayCoords = this.gameViewOptions.displayCoords;
        this.orientation = this.modOrientation(this.gameViewOptions.orientation);

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

        this.cellShadings = Array(this.boardsize).fill(null).map(() => Array(this.boardsize).fill(0));

        this.gameContainer.addChild(
            this.boardContainer,
            this.createHexesContainer(),
            this.entityLayersContainer,
            this.coordsContainer = new Container(),
        );

        this.redrawBoard();
        this.redrawCoords();
    }

    private async doMount(element: HTMLElement): Promise<void>
    {
        this.containerElement = element;

        this.pixi = new Application();

        await this.pixi.init({
            antialias: true,
            backgroundAlpha: 0,
            resolution: ceil(window.devicePixelRatio), // passing devicePixelRatio * 2 here, and no longer need to double resolution of PIXI.Text
            autoDensity: true,
            resizeTo: element,
            eventMode: this.gameViewOptions.interactive ? 'passive' : 'none',
            ...this.getWrapperSize(),
        });

        this.pixi.stage.addChild(this.backgroundContainer, this.gameContainer);

        // Load theme assets (i.e images), then redraw everything that has been drawn before assets were loaded
        if (themeNeedsLoading(this.theme)) {
            const themeVersion = this.themeVersion;
            await loadTheme(this.theme);

            if (themeVersion === this.themeVersion) {
                this.redrawAfterThemeChanged();
            }
        }

        this.redrawBackground();

        this.listenContainerElementResize(element);

        this.redrawAfterOrientationOrWrapperSizeChanged();

        const canvas = this.getView();
        element.appendChild(canvas);

        // Allow native page scrolling on mobile. Pixi sets touch-action:none by default.
        // Prevent being scroll blocked when GameView take most of screen, or to scroll horizontally in "My games" section on lobby
        canvas.style.touchAction = 'auto';
        canvas.addEventListener('touchmove', () => this.clearLongPressTimeout(), { passive: true });
        canvas.addEventListener('pointercancel', () => this.clearLongPressTimeout());
    }

    getHex(move: Move): Hex
    {
        const { row, col } = parseMove(move);

        return this.hexes[row][col];
    }

    getHexByCoords(coords: Coords): Hex
    {
        const { row, col } = coords;

        return this.hexes[row][col];
    }

    setHex(move: Move, hex: Hex): void
    {
        const { row, col } = parseMove(move);

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
        if (this.containerElement) {
            throw new Error('GameView already mounted.');
        }

        try {
            await this.doMount(element);
            this.initPromise.resolve();
            this.initialized = true;
            this.emit('mounted');
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
        this.redrawBackground();
        this.redrawBoard();
        this.updateEntitiesTheme();
        this.updateEntitiesRotation();
        this.redrawCoords();
    }

    /**
     * Draw or redraw application background, when theme or size changed.
     */
    private redrawBackground(): void
    {
        // Do not destroy textures, they may be shared (i.e images from Assets cache)
        for (const child of this.backgroundContainer.removeChildren()) {
            child.destroy({ children: true });
        }

        const wrapperSize = this.getWrapperSize();

        if (!this.theme.background || wrapperSize === null) {
            return;
        }

        this.backgroundContainer.addChild(this.theme.background({
            ...wrapperSize,
            colors: this.theme.colors,
        }));
    }

    /**
     * Draw or redraw board with current theme,
     * and reapply sides highlight and cells shading.
     */
    private redrawBoard(): void
    {
        // Do not destroy textures, they may be shared (i.e images from Assets cache)
        for (const child of this.boardContainer.removeChildren()) {
            child.destroy({ children: true });
        }

        this.boardView = this.theme.board({
            boardsize: this.boardsize,
            colors: this.theme.colors,
        });

        this.boardContainer.addChild(this.boardView.container);

        this.highlightSides(...this.sidesHighlighted);

        for (let row = 0; row < this.boardsize; ++row) {
            for (let col = 0; col < this.boardsize; ++col) {
                if (this.cellShadings[row][col] !== 0) {
                    this.boardView.setCellShading?.(row, col, this.cellShadings[row][col]);
                }
            }
        }
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
        this.redrawBackground();
        this.redrawAfterOrientationOrWrapperSizeChanged();

        this.emit('resized');
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
    getWrapperSize(): null | GameViewSize
    {
        if (this.containerElement === null) {
            return null;
        }

        const { width, height } = this.containerElement.getBoundingClientRect();

        return { width, height };
    }

    getPixiApp()
    {
        return this.pixi;
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
        orientation = this.modOrientation(orientation);

        if (orientation === this.orientation) {
            return;
        }

        this.orientation = orientation;

        this.redrawAfterOrientationOrWrapperSizeChanged();

        this.emit('orientationChanged');
    }

    getTheme(): BoardTheme
    {
        return this.theme;
    }

    /**
     * Change theme and redraw board.
     * Theme assets (i.e images) are loaded before theme is applied.
     *
     * @returns Promise resolved when theme is applied
     */
    async setTheme(theme: BoardTheme): Promise<void>
    {
        const themeVersion = ++this.themeVersion;

        await loadTheme(theme);

        // Another theme has been set while loading this one
        if (themeVersion !== this.themeVersion) {
            return;
        }

        this.theme = theme;

        this.redrawAfterThemeChanged();
    }

    /**
     * Rescale the game board to fit in the container,
     * depending on board orientation.
     */
    private autoResize(): void
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
                const hex = new Hex();

                hex.position = Hex.coords(row, col);

                this.hexes[row][col] = hex;

                hexesContainer.addChild(hex);

                hex.on('pointerdown', () => {
                    this.emit('hexPointerDown', coordsToMove({ row, col }));
                });

                hex.on('pointerover', () => {
                    this.emit('hexHovered', coordsToMove({ row, col }));
                });

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
                    if ((e.ctrlKey || e.metaKey)) {
                        this.emit('hexClickedSecondary', coordsToMove({ row, col }));
                        return;
                    }

                    this.emit('hexClicked', coordsToMove({ row, col }));
                });
            }
        }

        return hexesContainer;
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

        const coordsRenderer = this.theme.coords ?? defaultCoords;

        const createText = (label: string, x: number, y: number, axis: 'letter' | 'number'): Container => {
            const text = coordsRenderer({ label, axis, colors: this.theme.colors });

            const hexCoords = Hex.coords(x, y);
            text.position.set(hexCoords.x, hexCoords.y);

            this.coordsTexts.push(text);

            return text;
        };

        for (let i = 0; i < this.boardsize; ++i) {
            const number = rowToNumber(i);
            container.addChild(createText(number, i, -1, 'number'));
            container.addChild(createText(number, i, this.boardsize, 'number'));

            const letter = colToLetter(i);
            container.addChild(createText(letter, -1, i, 'letter'));
            container.addChild(createText(letter, this.boardsize, i, 'letter'));
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
        this.sidesHighlighted = [red, blue];

        if (!this.boardView.sides) {
            return;
        }

        const { highlighted = 1, faded = 0.25 } = this.theme.sidesAlpha ?? {};

        this.boardView.sides[0].alpha = red ? highlighted : faded;
        this.boardView.sides[1].alpha = blue ? highlighted : faded;
    }

    highlightSideForPlayer(playerIndex: 0 | 1): void
    {
        this.highlightSides(
            playerIndex === 0,
            playerIndex === 1,
        );
    }

    getCellShading(coords: Coords): number
    {
        return this.cellShadings[coords.row][coords.col];
    }

    /**
     * Shade a cell, used to show shading patterns.
     *
     * @param shading Between 0 and 1: 0 = not shaded, 1 = shaded,
     *                0.5 = half-shaded (i.e for tri color shading patterns)...
     */
    setCellShading(coords: Coords, shading: number): void
    {
        shading = max(0, min(1, shading));

        this.cellShadings[coords.row][coords.col] = shading;
        this.boardView.setCellShading?.(coords.row, coords.col, shading);
    }

    getStone(move: Move): null | Stone
    {
        return this.stones[move] ?? null;
    }

    setStone(move: Move, byPlayerIndex: null | 0 | 1, faded = false): void
    {
        if (this.stones[move]) {
            this.removeEntity(this.stones[move]);
            delete this.stones[move];
        }

        if (byPlayerIndex !== null) {
            this.stones[move] = new Stone(byPlayerIndex, faded);
            this.stones[move].setCoords(parseMove(move));
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

    addEntity(entity: BoardEntity, group: string = GameView.DEFAULT_ENTITY_GROUP): BoardEntity
    {
        entity.initOnce(this.theme);
        entity.updateRotation(this.gameContainer.rotation);

        this.getGroup(group).addChild(entity);

        return entity;
    }

    /**
     * Removes an entity.
     */
    removeEntity(entity: BoardEntity): void
    {
        entity.removeFromParent();
    }

    removeEntitiesGroup(group: string = GameView.DEFAULT_ENTITY_GROUP): void
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
        this.emit('destroyBefore');

        this.destroyResizeObserver(); // Must disconnect resize observer before destroying pixi app, the observed element

        this.pixi.destroy(true);

        this.emit('destroyAfter');
    }
}
