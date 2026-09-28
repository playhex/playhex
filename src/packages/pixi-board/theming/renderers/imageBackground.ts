import { Container, Graphics, Rectangle } from 'pixi.js';
import { BackgroundRenderer } from '../types.js';
import { coverSprite, loadImage } from './coverSprite.js';

export type ImageBackgroundParams = {
    /**
     * Image covering the whole background, cropped to keep its aspect ratio.
     */
    url: string;

    /**
     * Color displayed while image is loading, or through transparent parts of the image.
     * If not set, transparent.
     */
    color?: number;
};

/**
 * Fills the whole background with an image.
 * Image is loaded by `load()`, called by GameView before drawing.
 */
export const imageBackground = ({ url, color }: ImageBackgroundParams): BackgroundRenderer => {
    const renderer: BackgroundRenderer = ({ width, height }) => {
        const container = new Container();

        if (color !== undefined) {
            const g = new Graphics();

            g.rect(0, 0, width, height);
            g.fill({ color });

            container.addChild(g);
        }

        const sprite = coverSprite(url, new Rectangle(0, 0, width, height));

        if (sprite) {
            container.addChild(sprite);
        }

        return container;
    };

    renderer.load = () => loadImage(url);

    return renderer;
};
