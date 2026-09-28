import { Container, Graphics } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

/**
 * Show a dot on 4-4 cells, styled by theme.
 */
export default class Anchor44Mark extends BoardEntity
{
    constructor()
    {
        super();

        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const {
            color = this.theme.colors.text,
            alpha = 0.2,
            size = 0.2,
            shape = 'circle',
        } = this.theme.anchor44 ?? {};

        const g = new Graphics();
        const radius = Hex.RADIUS * size;

        this.alwaysTop = shape === 'square';

        if (shape === 'square') {
            g.rect(-radius, -radius, radius * 2, radius * 2);
        } else {
            g.circle(0, 0, radius);
        }

        g.fill({ color, alpha });

        return g;
    }
}
