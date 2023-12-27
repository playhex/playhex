import TimeControlType from '../TimeControlType';
import { AbstractFischerTimeControl } from '../AbstractFischerTimeControl';

export interface SimpleTimeControlOptions
{
    secondsPerMove: number;
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
            options.secondsPerMove,
            options.secondsPerMove,
            options.secondsPerMove,
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
