import { ThemedMark } from './ThemedMark.js';
import { swapArrowsMark } from '../theming/renderers/swapArrowsMark.js';
import { MarkRenderer } from '../theming/types.js';

/**
 * Default swappable mark, when theme does not define one:
 * two white semi-transparent arrows around the stone.
 */
const defaultSwappableMark = swapArrowsMark();

/**
 * Shows that first stone can be swapped if applicable, drawn by theme.
 */
export default class SwappableMark extends ThemedMark
{
    protected override getRenderer(): MarkRenderer
    {
        return this.theme.swappable ?? defaultSwappableMark;
    }
}
