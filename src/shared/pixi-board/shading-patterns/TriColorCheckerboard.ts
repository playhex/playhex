import { ShadingPatternInterface } from './ShadingPatternInterface.js';

/**
 * Same as Hexdb theme: http://www.mseymour.ca/hexdb.html
 */
export class TriColorCheckerboard implements ShadingPatternInterface
{
    calc(row: number, col: number, size: number): number
    {
        return ((size + row - col + 1) % 3) / 2;
    }
}
