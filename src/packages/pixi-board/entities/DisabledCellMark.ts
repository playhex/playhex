import { Container, Graphics, PointData } from 'pixi.js';
import { BoardEntity } from '../BoardEntity.js';
import { darken, lighten } from '../colorUtils.js';
import Hex from '../Hex.js';

/**
 * Greys out a cell that cannot be played, i.e in a puzzle, styled by theme.
 * Should be added in a group below 4-4 anchors and stones, see `GameView.setGroupZIndex()`.
 */
export default class DisabledCellMark extends BoardEntity
{
    constructor()
    {
        super();

        this.listenThemeChange = true;
    }

    protected override draw(): Container
    {
        const {
            color = this.getDefaultColor(),
            alpha = 1,
            size = 1 - Hex.PADDING,
        } = this.theme.disabledCell ?? {};

        const g = new Graphics();
        const path: PointData[] = [];

        for (let i = 0; i < 6; ++i) {
            path.push(Hex.cornerCoords(i, Hex.RADIUS * size));
        }

        g.poly(path);
        g.fill({ color, alpha });

        return g;
    }

    /**
     * Cell color is not known from theme, so grey is derived from text color:
     * light text means dark theme, so a very dark grey, else a light grey.
     */
    private getDefaultColor(): number
    {
        const { text } = this.theme.colors;
        const luminance = 0.299 * (text >> 16 & 0xff) + 0.587 * (text >> 8 & 0xff) + 0.114 * (text & 0xff);

        return luminance > 128
            ? darken(text, 0.84)
            : lighten(text, 0.65)
        ;
    }
}
