import { GameView, Hex } from '@playhex/pixi-board';
import { Graphics } from 'pixi.js';

/**
 * Displays policy marks (hexagon markers) on top of board cells,
 * showing where the analyzer suggests to play.
 */
export class PolicyOverlayFacade
{
    private overlays: Graphics[][];

    constructor(
        private gameView: GameView,
    ) {
        this.overlays = this.init();
    }

    private init(): Graphics[][]
    {
        const overlays: Graphics[][] = [];

        for (let row = 0; row < this.gameView.getBoardsize(); ++row) {
            overlays[row] = [];
            for (let col = 0; col < this.gameView.getBoardsize(); ++col) {
                const g = new Graphics();
                overlays[row][col] = g;
                this.gameView.getHexByCoords({ row, col }).addChild(g);
            }
        }

        return overlays;
    }

    clear(): void
    {
        for (const row of this.overlays) {
            for (const g of row) {
                g.alpha = 0;
            }
        }
    }

    apply(policy: number[][], color: 'black' | 'white'): void
    {
        const markerColor = color === 'black' ? 0xee3333 : 0x3388ee;
        const max = Math.max(...policy.flat());

        for (let row = 0; row < this.gameView.getBoardsize(); ++row) {
            for (let col = 0; col < this.gameView.getBoardsize(); ++col) {
                const g = this.overlays[row][col];
                g.clear();
                g.regularPoly(0, 0, Hex.INNER_RADIUS * 0.6, 6);
                g.fill({ color: markerColor });
                g.alpha = max > 0 ? policy[row][col] / max : 0;
            }
        }
    }
}
