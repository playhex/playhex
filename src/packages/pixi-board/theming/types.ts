import { Container } from 'pixi.js';

export type ThemeMode = 'light' | 'dark';

export type ThemeMetadata = {
    /**
     * Unique identifier, i.e "playhex"
     */
    id: string;

    /**
     * Displayed name, i.e "PlayHex"
     */
    name: string;

    description?: string;

    author?: string;

    /**
     * ISO 8601 date or datetime,
     * i.e "2026-09-28" or "2026-09-28T14:00:00Z"
     */
    releaseDate?: string;
};

/**
 * Semantic colors of a theme.
 * Used by renderers as default colors, and by marks, coords...
 */
export type ThemeColors = {
    /**
     * First player: red, or black.
     */
    player1: number;

    /**
     * Second player: blue, or white.
     */
    player2: number;

    /**
     * Coords, or any front color, used for text, or 4-4 dots.
     */
    text: number;

    /**
     * Color of coords letters (columns, along top and bottom sides).
     * Defaults to text color.
     */
    coordsLetters?: number;

    /**
     * Color of coords numbers (rows, along left and right sides).
     * Defaults to text color.
     */
    coordsNumbers?: number;
};

export type BackgroundRenderContext = {
    /**
     * Size of the pixi application, in screen pixels.
     */
    width: number;
    height: number;

    colors: ThemeColors;
};

/**
 * Draws the background of the whole pixi application, below the board.
 * In screen space: not rotated nor scaled with the board.
 * Called again when application is resized.
 */
export type BackgroundRenderer = ((context: BackgroundRenderContext) => Container) & {
    /**
     * Optional async preload (i.e images).
     * Called by GameView before drawing with this background renderer.
     */
    load?: () => Promise<void>;
};

export type BoardRenderContext = {
    boardsize: number;
    colors: ThemeColors;
};

/**
 * What a board renderer has drawn.
 */
export type BoardView = {
    /**
     * Whole board, placed below stones.
     * Positioned with same coordinates system as cells, see `Hex.coords()`.
     */
    container: Container;

    /**
     * Player sides, [player1, player2].
     * Their alpha is changed to highlight current player.
     */
    sides?: [Container, Container];

    /**
     * Shows shading pattern on a cell.
     *
     * @param shading Between 0 and 1: 0 = not shaded, 1 = shaded,
     *                0.5 = half-shaded (i.e for tri color shading patterns)...
     */
    setCellShading?: (row: number, col: number, shading: number) => void;
};

/**
 * Draws the whole board: cells, lines, sides...
 * Not per cell because some boards are not drawn cell by cell (i.e go-like board).
 */
export type BoardRenderer = ((context: BoardRenderContext) => BoardView) & {
    /**
     * Optional async preload (i.e images).
     * Called by GameView before drawing with this board renderer.
     */
    load?: () => Promise<void>;
};

export type StoneRenderContext = {
    playerIndex: 0 | 1;
    colors: ThemeColors;
};

/**
 * How a stone rotates when board rotates:
 * - `free`: rotates with the board
 * - `upright`: always looks at top, i.e for images
 * - `flatTop`: stays flat-topped, for hexagon stones
 */
export type StoneOrientation = 'free' | 'upright' | 'flatTop';

export type StoneRenderer = {
    /**
     * Draws a stone centered on (0, 0).
     */
    draw: (context: StoneRenderContext) => Container;

    /**
     * Defaults to `free`.
     */
    orientation?: StoneOrientation;

    /**
     * Optional async preload (i.e images).
     * Called by GameView before drawing with this stone renderer.
     */
    load?: () => Promise<void>;
};

export type CoordsRenderContext = {
    /**
     * Text to display, i.e "a" or "11"
     */
    label: string;

    /**
     * Letters are columns, along top and bottom sides.
     * Numbers are rows, along left and right sides.
     */
    axis: 'letter' | 'number';

    colors: ThemeColors;
};

/**
 * Draws a coord label centered on (0, 0).
 * Position and upright rotation are handled by GameView.
 */
export type CoordsRenderer = (context: CoordsRenderContext) => Container;

/**
 * Opacity of player sides, between 0 and 1,
 * used to show which player is currently playing.
 */
export type SidesAlpha = {
    /**
     * Sides of player currently playing. Defaults to 1.
     */
    highlighted?: number;

    /**
     * Sides of other player. 0 hides them. Defaults to 0.25.
     */
    faded?: number;
};

export type MarkRenderContext = {
    /**
     * Player of the stone below the mark, null if no stone or unknown.
     */
    playerIndex: null | 0 | 1;

    colors: ThemeColors;
};

/**
 * Draws a mark on a cell, i.e last move mark, swappable or swapped marks.
 */
export type MarkRenderer = {
    /**
     * Draws a mark centered on (0, 0).
     */
    draw: (context: MarkRenderContext) => Container;

    /**
     * Defaults to `free`.
     */
    orientation?: StoneOrientation;
};

/**
 * Style of the 4-4 anchors (dots on 4-4 points).
 */
export type Anchor44Style = {
    /**
     * Defaults to theme text color.
     */
    color?: number;

    /**
     * Opacity, between 0 and 1. Defaults to 0.2.
     */
    alpha?: number;

    /**
     * Radius of the dot, or half side of the square, relative to cell radius. Defaults to 0.2.
     */
    size?: number;

    /**
     * Defaults to circle. Square is always upright.
     */
    shape?: 'circle' | 'square';
};

/**
 * A resolved theme, ready to draw a board.
 */
export type BoardTheme = {
    colors: ThemeColors;

    /**
     * Fills the whole pixi application, below the board.
     * If undefined, background is transparent.
     */
    background?: BackgroundRenderer;

    board: BoardRenderer;

    stones: StoneRenderer;

    sidesAlpha?: SidesAlpha;

    anchor44?: Anchor44Style;

    /**
     * Draws coords around the board.
     * Defaults to Arial text.
     */
    coords?: CoordsRenderer;

    /**
     * Mark shown on last played stone.
     * Defaults to a small white semi-transparent hexagon.
     */
    lastMove?: MarkRenderer;

    /**
     * Mark shown on first stone when it can be swapped.
     * Defaults to two white semi-transparent arrows around the stone.
     */
    swappable?: MarkRenderer;

    /**
     * Mark shown on stone that has been swapped.
     * Defaults to a white semi-transparent 'S'.
     */
    swapped?: MarkRenderer;

    /**
     * Optional async preload (i.e images).
     * Called by GameView before drawing with this theme.
     */
    load?: () => Promise<void>;
};

/**
 * Overrides some values of a theme.
 * Colors, anchor44 and sidesAlpha are merged, so can be partially overridden.
 */
export type BoardThemeOverride = Partial<Omit<BoardTheme, 'colors'>> & {
    colors?: Partial<ThemeColors>;
};

/**
 * A theme, as provided by a theme author.
 *
 * `theme` is used in both light and dark mode,
 * unless `light` or `dark` override some of its values.
 */
export type ThemeDefinition = {
    metadata: ThemeMetadata;
    theme: BoardTheme;
    light?: BoardThemeOverride;
    dark?: BoardThemeOverride;
};
