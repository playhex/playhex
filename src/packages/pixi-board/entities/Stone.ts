import { Container, Ticker } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';

const animationDuration = 50;
const animationCurve = Array(animationDuration).fill(0).map((_, i) => {
    const x = i / animationDuration;

    return 1 - (2 * (x - 1) ** 2 - 1) ** 2;
});

/**
 * A stone, drawn by the theme stone renderer.
 */
export default class Stone extends BoardEntity
{
    private animationLoop: null | (() => void) = null;

    constructor(
        private playerIndex: 0 | 1,
        private faded = false,
    ) {
        super();

        this.listenThemeChange = true;
    }

    getPlayerIndex(): 0 | 1
    {
        return this.playerIndex;
    }

    isFaded(): boolean
    {
        return this.faded;
    }

    protected override draw(): Container
    {
        const { stones, colors } = this.theme;
        const orientation = stones.orientation ?? 'free';

        this.alwaysTop = orientation === 'upright';
        this.alwaysFlatTop = orientation === 'flatTop';

        const container = stones.draw({
            playerIndex: this.playerIndex,
            colors,
        });

        if (this.faded) {
            container.alpha = 0.5;
        }

        return container;
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
