import { Assets, Rectangle, Sprite, Texture } from 'pixi.js';

/**
 * Preload an image, to be used later with `coverSprite()`.
 */
export const loadImage = async (url: string): Promise<void> => {
    await Assets.load(url);
};

/**
 * Sprite covering a rectangle with an image, like css `background-size: cover`:
 * keeps image aspect ratio, centered, and overflows the rectangle.
 *
 * @returns null if image is not loaded yet (see `loadImage()`)
 */
export const coverSprite = (url: string, { x, y, width, height }: Rectangle): null | Sprite => {
    if (!Assets.cache.has(url)) {
        return null;
    }

    const texture: Texture = Assets.get(url);
    const sprite = new Sprite(texture);

    sprite.anchor.set(0.5);
    sprite.position.set(x + width / 2, y + height / 2);
    sprite.scale.set(Math.max(width / texture.width, height / texture.height));

    return sprite;
};
