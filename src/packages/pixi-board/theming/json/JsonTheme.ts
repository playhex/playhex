import { ThemeMetadata } from '../types.js';

/**
 * Any css color: "#dc3545", "#fff", "red", "rgb(220, 53, 69)"...
 */
export type JsonColor = string;

export type JsonColorBackground = {
    type: 'color';
    color: JsonColor;
};

export type JsonImageBackground = {
    type: 'image';

    /**
     * Image covering the whole background, cropped to keep its aspect ratio
     */
    url: string;

    /**
     * Displayed while image is loading. Transparent if not set
     */
    color?: JsonColor;
};

export type JsonHexBoard = {
    type: 'hex';
    cellColor: JsonColor;
    strokeColor: JsonColor;

    /**
     * Defaults to a darker cellColor
     */
    shadingColor?: JsonColor;

    strokeWidth?: number;
    sidesWidth?: number;

    /**
     * Defaults to colors.player1 and colors.player2
     */
    sidesColors?: [JsonColor, JsonColor];

    /**
     * Draw sides in a frame with straight edges and rounded corners
     */
    frame?: boolean;
    frameMargin?: number;
    frameCornerRadius?: number;

    /**
     * No frame outline if not set
     */
    frameStrokeColor?: JsonColor;
    frameStrokeWidth?: number;
};

export type JsonGoBoard = {
    type: 'go';
    lineColor: JsonColor;
    lineWidth?: number;

    /**
     * If not set, only lines are drawn
     */
    boardColor?: JsonColor;

    /**
     * Url of an image (i.e wood texture) covering the board, above boardColor
     */
    boardImage?: string;

    boardPadding?: number;
    sidesOffset?: number;
    sidesWidth?: number;

    /**
     * Defaults to colors.player1 and colors.player2
     */
    sidesColors?: [JsonColor, JsonColor];

    /**
     * Defaults to lineColor
     */
    shadingColor?: JsonColor;
};

export type JsonHexStones = {
    type: 'hex';
    size?: number;

    /**
     * Defaults to colors.player1 and colors.player2
     */
    colors?: [JsonColor, JsonColor];
};

export type JsonCircleStones = {
    type: 'circle';
    size?: number;

    /**
     * Defaults to colors.player1 and colors.player2
     */
    colors?: [JsonColor, JsonColor];

    /**
     * No outline if not set
     */
    strokeColor?: JsonColor;
    strokeWidth?: number;
};

export type JsonImageStones = {
    type: 'image';
    player1Url: string;
    player2Url: string;
    size?: number;
};

export type JsonAnchor44 = {
    /**
     * Defaults to colors.text
     */
    color?: JsonColor;

    /**
     * Between 0 and 1, defaults to 0.2
     */
    alpha?: number;

    /**
     * Radius (or half side of square) relative to cell radius, defaults to 0.2
     */
    size?: number;

    /**
     * Defaults to circle
     */
    shape?: 'circle' | 'square';
};

export type JsonDisabledCell = {
    /**
     * Defaults to a grey derived from colors.text, light on light themes, very dark on dark themes
     */
    color?: JsonColor;

    /**
     * Between 0 and 1, defaults to 1
     */
    alpha?: number;

    /**
     * Radius relative to cell radius, defaults to 0.94. 1 covers the whole cell
     */
    size?: number;
};

export type JsonTextCoords = {
    type: 'text';

    /**
     * Defaults to Arial
     */
    fontFamily?: string;

    /**
     * Relative to cell radius, defaults to 0.6
     */
    fontSize?: number;

    fontWeight?: 'normal' | 'bold';
};

export type JsonLastMove = {
    type: 'hexagon' | 'circle' | 'square';

    /**
     * Defaults to colors.text
     */
    color?: JsonColor;

    /**
     * Color depending on stone below: [on player1 stone, on player2 stone]
     */
    colors?: [JsonColor, JsonColor];

    /**
     * Between 0 and 1, defaults to 1
     */
    alpha?: number;

    /**
     * Radius (or half side of square) relative to cell radius, defaults to 0.3
     */
    size?: number;
};

export type JsonSwappable = {
    type: 'arrows';

    /**
     * Defaults to white
     */
    color?: JsonColor;

    /**
     * Color depending on stone below: [on player1 stone, on player2 stone]
     */
    colors?: [JsonColor, JsonColor];

    /**
     * Between 0 and 1, defaults to 0.4
     */
    alpha?: number;

    /**
     * Scale of the arrows, defaults to 1
     */
    size?: number;
};

export type JsonSwapped = {
    type: 'text';

    /**
     * Defaults to "S"
     */
    text?: string;

    /**
     * Defaults to white
     */
    color?: JsonColor;

    /**
     * Color depending on stone below: [on player1 stone, on player2 stone]
     */
    colors?: [JsonColor, JsonColor];

    /**
     * Between 0 and 1, defaults to 0.4
     */
    alpha?: number;

    /**
     * Font size relative to cell radius, defaults to 1.4
     */
    size?: number;

    /**
     * Defaults to Arial
     */
    fontFamily?: string;

    /**
     * Defaults to bold
     */
    fontWeight?: 'normal' | 'bold';
};

/**
 * A theme, or a light/dark variant of the theme.
 */
export type JsonThemeVariant = {
    colors: {
        player1: JsonColor;
        player2: JsonColor;
        text: JsonColor;

        /**
         * Coords letters and numbers colors, default to text
         */
        coordsLetters?: JsonColor;
        coordsNumbers?: JsonColor;
    };

    /**
     * If not set, background is transparent.
     */
    background?: JsonColorBackground | JsonImageBackground;

    board: JsonHexBoard | JsonGoBoard;

    stones: JsonHexStones | JsonCircleStones | JsonImageStones;

    /**
     * Opacity of sides, between 0 and 1:
     * highlighted for player currently playing (defaults to 1),
     * faded for other player (defaults to 0.25, 0 to hide)
     */
    sidesAlpha?: {
        highlighted?: number;
        faded?: number;
    };

    /**
     * Style of 4-4 anchors
     */
    anchor44?: JsonAnchor44;

    /**
     * Style of disabled cells, i.e greyed out puzzle cells
     */
    disabledCell?: JsonDisabledCell;

    /**
     * Mark on last played stone
     */
    lastMove?: JsonLastMove;

    /**
     * Mark on first stone when it can be swapped
     */
    swappable?: JsonSwappable;

    /**
     * Mark on swapped stone
     */
    swapped?: JsonSwapped;

    /**
     * Coords style. Colors are colors.coordsLetters and colors.coordsNumbers, or colors.text
     */
    coords?: JsonTextCoords;
};

export type DeepPartial<T> = T extends unknown[]
    ? T
    : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T
;

/**
 * Theme format, used to create a theme with only a json file,
 * using predefined renderers.
 *
 * `light` and `dark` are deep merged into `theme`.
 * If an object `type` is changed (i.e stones type), the object is replaced instead of merged.
 *
 * `theme` can be incomplete, as long as `theme` merged with `light`,
 * and `theme` merged with `dark`, are complete.
 */
export type JsonTheme = {
    metadata: ThemeMetadata;

    theme: DeepPartial<JsonThemeVariant>;

    light?: DeepPartial<JsonThemeVariant>;

    dark?: DeepPartial<JsonThemeVariant>;
};
