import TimeControlType from '../TimeControlType';
import { AbstractFischerTimeControl } from '../AbstractFischerTimeControl';

export interface AbsoluteTimeControlOptions
{
    timePerPlayer: number;
}

/**
 * Players have same time for the whole game.
 */
export class AbsoluteTimeControl extends AbstractFischerTimeControl
{
    constructor(
        protected options: AbsoluteTimeControlOptions,
    ) {
        super(
            options,
            options.timePerPlayer,
        );
    }

    getOptions(): TimeControlType
    {
        return {
            type: 'absolute',
            options: this.options,
        };
    }
}
