import { Container, Graphics, Ticker } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import Hex from '../Hex.js';

const animationDuration = 50;
const animationCurve = Array(animationDuration).fill(0).map((_, i) => {
    const x = i / animationDuration;

    return 1 - (2 * (x - 1) ** 2 - 1) ** 2;
});

/**
 * Show a little white hexagon on a stone to show last move.
 * Should not be used on an empty cell because won't be visible on light theme.
 */
export default class Stone extends BoardEntity
{
    private animationLoop: null | (() => void) = null;

    constructor(
        private playerIndex: 0 | 1,
        private faded = false,
    ) {
        super();

        this.alwaysFlatTop = true;
        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const g = new Graphics();

        g.regularPoly(0, 0, Hex.INNER_RADIUS, 6);

        g.fill({
            color: this.playerIndex === 0
                ? this.theme.colorA
                : this.theme.colorB
            ,
            alpha: this.faded
                ? 0.5
                : 1
            ,
        });

        g.rotation = Math.PI / 6;

        return g;
    }

    private clearAnimationLoop(): void
    {
        if (this.animationLoop !== null) {
            if (this.destroyed) {
                // Call animationLoop to resolve promise if destroyed and prevent let it unresolved
                this.animationLoop();
            } else {
                this.scale = { x: 1, y: 1 };
            }

            Ticker.shared.remove(this.animationLoop);
            this.animationLoop = null;
        }
    }

    async animate(): Promise<void>
    {
        this.clearAnimationLoop();

        return await new Promise(resolve => {
            let i = 0;

            this.animationLoop = (): void => {
                if (this.destroyed) {
                    resolve();
                    return;
                }

                if (i >= animationDuration) {
                    this.clearAnimationLoop();
                    resolve();
                    return;
                }

                const coef = 1 - 0.75 * animationCurve[i];
                this.scale = { x: coef, y: coef };
                ++i;
            };

            Ticker.shared.add(this.animationLoop);
        });
    }
}
