import { colorAverage, darken } from './colorUtils.js';

export type Theme = {
    /**
     * Player red
     */
    colorA: number; // --bs-danger

    /**
     * Player blue
     */
    colorB: number; // --bs-primary

    /**
     * Muted colors for the three triangle sides of the Y board.
     * Purely decorative: in Y both players connect all three sides.
     */
    colorSide0: number; // muted --bs-info (top)
    colorSide1: number; // muted --bs-warning (left)
    colorSide2: number; // muted --bs-success (hypotenuse)

    /**
     * Empty cell background
     */
    colorEmpty: number; // --bs-light-bg-subtle

    /**
     * Empty cell background,
     * shading pattern color.
     */
    colorEmptyShade: number;

    /**
     * Line between cells
     */
    strokeColor: number; // --bs-dark-bg-subtle

    /**
     * Coordinates color
     * or any front color, used for text, or 4-4 dots
     */
    textColor: number; // --bs-body-color
};

const colorEmptyDark = 0x343a40;
const colorEmptyLight = 0xfcfcfd;

// Bootstrap base colors for the three sides, muted by mixing toward the
// board's empty-cell tone so they read as calm borders, not vivid accents.
const bsInfo = 0x0dcaf0;
const bsWarning = 0xffc107;
const bsSuccess = 0x198754;

const dark: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorSide0: colorAverage(bsInfo, colorEmptyDark, 0.5),
    colorSide1: colorAverage(bsWarning, colorEmptyDark, 0.5),
    colorSide2: colorAverage(bsSuccess, colorEmptyDark, 0.5),
    colorEmpty: colorEmptyDark,
    colorEmptyShade: darken(colorEmptyDark, 0.40),
    strokeColor: 0x1a1d20,
    textColor: 0xdee2e6,
};

const light: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorSide0: darken(colorAverage(bsInfo, colorEmptyLight, 0.35), 0.15),
    colorSide1: darken(colorAverage(bsWarning, colorEmptyLight, 0.35), 0.15),
    colorSide2: darken(colorAverage(bsSuccess, colorEmptyLight, 0.35), 0.15),
    colorEmpty: colorEmptyLight,
    colorEmptyShade: darken(colorEmptyLight, 0.22),
    strokeColor: 0xced4da,
    textColor: 0x212529,
};

export const themes = {
    dark,
    light,
};
