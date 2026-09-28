import { Container } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import { MarkRenderer } from '../theming/types.js';

/**
 * Mark drawn by a theme mark renderer, redrawn when theme changes.
 */
export abstract class ThemedMark extends BoardEntity
{
    /**
     * Player of the stone below this mark,
     * so theme can draw a mark visible on this stone.
     */
    private playerIndex: null | 0 | 1 = null;

    constructor()
    {
        super();

        this.listenThemeChange = true;
    }

    setPlayerIndex(playerIndex: null | 0 | 1): this
    {
        if (playerIndex !== this.playerIndex) {
            this.playerIndex = playerIndex;
            this.redraw();
        }

        return this;
    }

    /**
     * Renderer from current theme, or a default one.
     */
    protected abstract getRenderer(): MarkRenderer;

    protected override draw(): Container
    {
        const renderer = this.getRenderer();
        const orientation = renderer.orientation ?? 'free';

        this.alwaysTop = orientation === 'upright';
        this.alwaysFlatTop = orientation === 'flatTop';

        return renderer.draw({
            playerIndex: this.playerIndex,
            colors: this.theme.colors,
        });
    }
}
