import { ThemedMark } from './ThemedMark.js';
import { textMark } from '../theming/renderers/textMark.js';
import { MarkRenderer } from '../theming/types.js';

/**
 * Default swapped mark, when theme does not define one:
 * a white semi-transparent 'S'.
 */
const defaultSwappedMark = textMark({ text: 'S' });

/**
 * Show a 'S' on second player stone if she swapped, drawn by theme.
 */
export default class SwappedMark extends ThemedMark
{
    protected override getRenderer(): MarkRenderer
    {
        return this.theme.swapped ?? defaultSwappedMark;
    }
}
