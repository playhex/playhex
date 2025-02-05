import { Container, Graphics } from 'pixi.js';
import { Coords } from '../game-engine';
import Hex from './Hex';

export class Mark extends Container
{
    private initialized = false;

    private coords: Coords = { row: 0, col: 0 };

    private rotationFixedContainer = new Container();

    /**
     * When board rotate, always keep mark at same rotation.
     */
    protected alwaysTop = false;

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
        this.rotationFixedContainer.rotation = -containerRotation;
    }
}
