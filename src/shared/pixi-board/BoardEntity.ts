import { Container, Graphics } from 'pixi.js';
import Hex from './Hex.js';
import { Coords } from '../move-notation/move-notation.js';
import { Theme } from './BoardTheme.js';

const PI_6 = Math.PI / 6;
const PI_3 = Math.PI / 3;

/**
 * Entity placed on the board.
 *
 * Rotation can be updated automatically when the board rotate,
 * depending on how it needs to be:
 * - `none`: entity rotate with the board
 * - `alwaysTop`: entity always looks at top, useful for letters
 * - `alwaysFlatTop`: entity is rotated between 0 and PI/6 to keep flat top, useful for hexagon-like entities
 *
 * Both `alwaysTop` and `alwaysFlatTop` can be used to keep top, but add PI/6 to stay inside the hexagon.
 */
export class BoardEntity extends Container
{
    private initialized = false;

    private coords: Coords = { row: 0, col: 0 };

    private rotationFixedContainer = new Container();

    /**
     * When board rotate, always keep mark at same rotation.
     */
    protected alwaysTop = false;

    /**
     * When board rotate and hexagons are tilted 30°
     * (flat-top vs pointy-top orientation),
     * set this to true to make this mark always flat-top,
     * and automatically add 30° or not depending on orientation.
     */
    protected alwaysFlatTop = false;

    /**
     * Whether this entity needs to redraw when GameView theme changed.
     */
    protected listenThemeChange = false;

    /**
     * Current theme of the GameView.
     */
    protected theme: Theme;

    initOnce(theme: Theme): void
    {
        if (this.initialized) {
            this.updatePosition();
            this.onThemeUpdated(theme);
            return;
        }

        this.initialized = true;
        this.theme = theme;

        this.updatePosition();
        this.rotationFixedContainer.addChild(this.draw());
        this.addChild(this.rotationFixedContainer);
    }

    onThemeUpdated(theme: Theme): void
    {
        if (!this.listenThemeChange) {
            return;
        }

        this.theme = theme;

        for (const child of this.rotationFixedContainer.removeChildren()) {
            child.destroy();
        }

        this.rotationFixedContainer.addChild(this.draw());
    }

    getCoords()
    {
        return this.coords;
    }

    setCoords(coords: Coords): BoardEntity
    {
        this.coords = coords;
        this.updatePosition();

        return this;
    }

    private updatePosition(): void
    {
        this.position = Hex.coords(this.coords.row, this.coords.col);
    }

    show(): BoardEntity
    {
        this.visible = true;

        return this;
    }

    hide(): BoardEntity
    {
        this.visible = false;

        return this;
    }

    /**
     * Called once, just before adding to gameView.
     * Must returns its graphics.
     * Rotation will be fixed.
     * `this.theme` is available.
     */
    protected draw(): Container
    {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.5);
        g.fill({ color: 0x00ff00 });

        return g;
    }

    /**
     * Rotate BoardEntity graphics to make it always upside.
     * Can also make it always flat-topped or point-topped.
     */
    updateRotation(containerRotation: number): void
    {
        if (this.alwaysTop) {
            this.rotationFixedContainer.rotation = -containerRotation;
        }

        if (this.alwaysFlatTop) {
            this.rotationFixedContainer.rotation = Math.ceil(((this.rotationFixedContainer.rotation / PI_6) + 1) / 2) * PI_3 + PI_6;
        }
    }
}
