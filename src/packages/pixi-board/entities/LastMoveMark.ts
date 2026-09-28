import { ThemedMark } from './ThemedMark.js';
import { shapeMark } from '../theming/renderers/shapeMark.js';
import { MarkRenderer } from '../theming/types.js';

/**
 * Default last move mark, when theme does not define one:
 * a little white hexagon.
 * Should not be used on an empty cell because won't be visible on light theme.
 */
const defaultLastMoveMark = shapeMark({
    shape: 'hexagon',
    color: 0xffffff,
    alpha: 0.4,
    size: 0.3,
});

/**
 * Show a mark on a stone to show last move, drawn by theme.
 */
export default class LastMoveMark extends ThemedMark
{
    protected override getRenderer(): MarkRenderer
    {
        return this.theme.lastMove ?? defaultLastMoveMark;
    }
}
