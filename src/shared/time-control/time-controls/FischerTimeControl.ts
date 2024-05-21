import { AbstractFischerTimeControl } from '../AbstractFischerTimeControl';
import TimeControlType from '../TimeControlType';

export interface FischerTimeControlOptions
{
    initialTime: number;
    timeIncrement?: number;
    maxTime?: number;
}

/**
 * Players have same time for the whole game.
 */
export class FischerTimeControl extends AbstractFischerTimeControl
{
    constructor(
        protected options: FischerTimeControlOptions,
    ) {
        super(
            options,
            options.initialTime,
            options.timeIncrement,
            options.maxTime,
        );
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'fischer',
            options: this.options,
        };
    }
}
