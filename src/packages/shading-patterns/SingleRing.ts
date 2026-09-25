import { ShadingPatternInterface } from './ShadingPatternInterface.js';
import { distToSide } from './utils.js';

export class SingleRing implements ShadingPatternInterface
{
    calc(row: number, col: number, size: number): number
    {
        const height = Math.floor((size - 2) / 3);

        return distToSide(row, col, size) === height ? 1 : 0;
    }
}
