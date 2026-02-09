import { ShadingPatternInterface } from './ShadingPatternInterface.js';
import { distToSide } from './utils.js';

/**
 * Same as Hexworld theme: https://hexworld.org/board/
 */
export class ConcentricalRings implements ShadingPatternInterface
{
    calc(row: number, col: number, size: number): number
    {
        return distToSide(row, col, size) % 2;
    }
}
