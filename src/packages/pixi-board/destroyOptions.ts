import { DestroyOptions } from 'pixi.js';

/**
 * Options to destroy elements drawn by theme renderers.
 *
 * Destroys children, and graphics contexts: pixi does not destroy
 * a Graphics own context when an options object is passed, so `context` must be set.
 *
 * Does not destroy textures, they may be shared:
 * images from Assets cache (would break next boards using same image),
 * or gradients reused by all stones.
 */
export const destroyDrawnOptions: DestroyOptions = {
    children: true,
    context: true,
};
