import { darken } from './colorUtils.js';

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

const dark: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: colorEmptyDark,
    colorEmptyShade: darken(colorEmptyDark, 0.40),
    strokeColor: 0x1a1d20,
    textColor: 0xdee2e6,
};

const light: Theme = {
    colorA: 0xdc3545,
    colorB: 0x0d6efd,
    colorEmpty: colorEmptyLight,
    colorEmptyShade: darken(colorEmptyLight, 0.22),
    strokeColor: 0xced4da,
    textColor: 0x212529,
};

export const themes = {
    dark,
    light,
};
