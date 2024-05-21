import TimeControlType from '../TimeControlType';
import { AbstractFischerTimeControl } from '../AbstractFischerTimeControl';

export interface SimpleTimeControlOptions
{
    timePerMove: number;
}

/**
 * Players have same time for each move.
 */
export class SimpleTimeControl extends AbstractFischerTimeControl
{
    constructor(protected options: SimpleTimeControlOptions)
    {
        super(
            options,
            options.timePerMove,
            options.timePerMove,
            options.timePerMove,
        );
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'simple',
            options: this.options,
        };
    }
}
