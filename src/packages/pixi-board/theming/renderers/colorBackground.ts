import { Graphics } from 'pixi.js';
import { BackgroundRenderer } from '../types.js';

export type ColorBackgroundParams = {
    color: number;
};

/**
 * Fills the whole background with a single color.
 */
export const colorBackground = ({ color }: ColorBackgroundParams): BackgroundRenderer => ({ width, height }) => {
    const g = new Graphics();

    g.rect(0, 0, width, height);
    g.fill({ color });

    return g;
};
