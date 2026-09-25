import { ShadingPatternInterface } from './ShadingPatternInterface.js';

export class Height5Lines implements ShadingPatternInterface
{
    calc(row: number, col: number, size: number): number
    {
        if (size < 9) {
            return 0;
        }

        const oppositeRow = size - row - 1;
        const oppositeCol = size - col - 1;

        if (row === 4 || col === 4 || oppositeRow === 4 || oppositeCol === 4) {
            return 1;
        }

        return 0;
    }
}
