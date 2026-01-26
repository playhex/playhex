import { Container, Graphics } from 'pixi.js';
import Hex from './Hex.js';
import { Coords } from '../move-notation/move-notation.js';

const PI_6 = Math.PI / 6;
const PI_3 = Math.PI / 3;

export class Mark extends Container
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

    initOnce(): void
    {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        this.updatePosition();
        this.rotationFixedContainer.addChild(this.draw());
        this.addChild(this.rotationFixedContainer);
    }

    getCoords()
    {
        return this.coords;
    }

    setCoords(coords: Coords): Mark
    {
        this.coords = coords;
        this.updatePosition();

        return this;
    }

    private updatePosition(): void
    {
        this.position = Hex.coords(this.coords.row, this.coords.col);
        console.log(this.position, this.visible, this.alpha);
    }

    show(): Mark
    {
        this.visible = true;

        return this;
    }

    hide(): Mark
    {
        this.visible = false;

        return this;
    }

    /**
     * Called once, just before adding to gameView.
     * Must returns its graphics.
     * Rotation will be fixed.
     */
    protected draw(): Container
    {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.5);
        g.fill({ color: 0x00ff00 });

        return g;
    }

    /**
     * Rotate mark graphics to make it always upside.
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
