import { Assets, Sprite, Texture } from 'pixi.js';
import Hex from '../../Hex.js';
import { StoneRenderer } from '../types.js';

export type ImageStoneParams = {
    player1Url: string;
    player2Url: string;

    /**
     * Half of the image width and height, relative to cell radius.
     */
    size?: number;
};

/**
 * Stone drawn from an image, one image per player.
 * Images are loaded by `load()`, called by GameView before drawing.
 */
export const imageStone = ({ player1Url, player2Url, size = 0.9 }: ImageStoneParams): StoneRenderer => ({
    orientation: 'upright',
    load: async () => {
        await Assets.load([player1Url, player2Url]);
    },
    draw: ({ playerIndex }) => {
        const sprite = new Sprite(Texture.from(playerIndex === 0 ? player1Url : player2Url));

        sprite.anchor.set(0.5);
        sprite.width = Hex.RADIUS * size * 2;
        sprite.height = Hex.RADIUS * size * 2;

        return sprite;
    },
});
