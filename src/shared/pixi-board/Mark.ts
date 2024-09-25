import { Container, Graphics } from 'pixi.js';
import { Coords } from '../game-engine';
import Hex from './Hex';

export class Mark extends Container
{
    constructor(
        private coords: Coords = { row: 0, col: 0 },
    ) {
        super();

        this.updatePosition();
        this.draw();
    }

    getCoords()
    {
        return this.coords;
    }

    setCoords(coords: Coords): void
    {
        this.coords = coords;
        this.updatePosition();
    }

    private updatePosition(): void
    {
        this.position = Hex.coords(this.coords.row, this.coords.col);
    }

    show(): void
    {
        this.visible = true;
    }

    hide(): void
    {
        this.visible = false;
    }

    /**
     * Called once.
     * Must initialize its graphics and add as child.
     */
    protected draw(): void
    {
        const g = new Graphics();

        g.circle(0, 0, Hex.RADIUS * 0.5);
        g.fill({ color: 0x00ff00 });

        this.addChild(g);
    }
}
