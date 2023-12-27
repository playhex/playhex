import { AbstractFischerTimeControl } from '../AbstractFischerTimeControl';
import TimeControlType from '../TimeControlType';

export interface FischerTimeControlOptions
{
    initialSeconds: number;
    incrementSeconds?: number;
    maxSeconds?: number;
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
            options.initialSeconds,
            options.incrementSeconds,
            options.maxSeconds,
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
