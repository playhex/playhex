import { Container, FillGradient, Graphics } from 'pixi.js';
import Hex from '../../Hex.js';
import { StoneRenderer } from '../types.js';

/**
 * HexWorld stone: round stone with a 3d look, lit from top-left, with a shadow.
 * Always upright to keep light from top-left when board rotates.
 *
 * Low-level stone renderer specific to this theme, not available in json themes.
 */
export const hexworldStone = (size: number): StoneRenderer => {
    /*
     * Gradients are in local texture space (relative to shape bounds),
     * so they are created once and reused by all stones.
     */
    const gradients: { [color: number]: FillGradient } = {};
    let shadowGradient: null | FillGradient = null;

    const getGradient = (color: number, lightColor: number): FillGradient => gradients[color] ??= new FillGradient({
        type: 'radial',
        center: { x: 0.3, y: 0.3 },
        innerRadius: 0,
        outerCenter: { x: 0.3, y: 0.3 },
        outerRadius: 0.7,
        colorStops: [
            { offset: 0, color: lightColor },
            { offset: 0.1, color: lightColor },
            { offset: 0.8, color: color },
        ],
        textureSpace: 'local',
    });

    const getShadowGradient = (): FillGradient => shadowGradient ??= new FillGradient({
        type: 'radial',
        center: { x: 0.5, y: 0.5 },
        innerRadius: 0,
        outerCenter: { x: 0.5, y: 0.5 },
        outerRadius: 0.5,
        colorStops: [
            { offset: 0, color: 'rgba(0, 0, 0, 0.6)' },
            { offset: 0.8, color: 'rgba(0, 0, 0, 0.4)' },
            { offset: 1, color: 'rgba(0, 0, 0, 0)' },
        ],
        textureSpace: 'local',
    });

    return {
        orientation: 'upright',
        draw: ({ playerIndex, colors: themeColors }) => {
            const color = [themeColors.player1, themeColors.player2][playerIndex];
            const radius = Hex.RADIUS * size;
            const container = new Container();

            const shadow = new Graphics();

            shadow.circle(radius * 0.1, radius * 0.12, radius * 1.1);
            shadow.fill(getShadowGradient());

            const sphere = new Graphics();

            sphere.circle(0, 0, radius);
            sphere.fill(getGradient(color, [0x666666, 0xfdfcfc][playerIndex]));

            container.addChild(shadow, sphere);

            return container;
        },
    };
};
