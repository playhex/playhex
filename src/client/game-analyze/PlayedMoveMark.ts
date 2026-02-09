import { Container, Graphics, PointData } from 'pixi.js';
import { BoardEntity } from '../../shared/pixi-board/BoardEntity.js';
import Hex from '../../shared/pixi-board/Hex.js';
import { colorAverage } from '../../shared/pixi-board/colorUtils.js';

/**
 * Where player actually played.
 * Shows if played move is good or bad, relative to best move.
 * Note that it's always over a played cell.
 */
export class PlayedMoveMark extends BoardEntity
{
    private whiteWinIndicator: Graphics;

    override draw()
    {
        const container = new Container();

        container.addChild(
            this.createBackground(),
            this.whiteWinIndicator = this.createWhiteWinIndicator(),
        );

        return container;
    }

    /**
     * @param whiteWinDiff Points lost in this move. Between [0 ; 1]
     *                      0 = no point lost, best move.
     *                      1 = big blunder
     */
    setWhiteWinDiff(whiteWinDiff: number): void
    {
        const color = colorAverage(0x00ff00, 0xff0000, Math.abs(whiteWinDiff));
        this.whiteWinIndicator.tint = color;
    }

    private createBackground(): Graphics
    {
        const background = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS * 0.6));
        }

        background.poly(path);
        background.fill({ color: '0xffffff', alpha: 0.8 });

        return background;
    }

    private createWhiteWinIndicator(): Graphics
    {
        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.INNER_RADIUS * 0.4));
        }

        g.poly(path);
        g.fill({ color: '0xffffff' });

        return g;
    }
}
