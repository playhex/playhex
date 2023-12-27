import { AbstractTimeControl } from './TimeControl';
import { AbsoluteTimeControl, AbsoluteTimeControlOptions } from './time-controls/AbsoluteTimeControl';
import { ByoYomiTimeControl, ByoYomiTimeControlOptions } from './time-controls/ByoYomiTimeControl';
import { FischerTimeControl, FischerTimeControlOptions } from './time-controls/FischerTimeControl';
import { SimpleTimeControl, SimpleTimeControlOptions } from './time-controls/SimpleTimeControl';

type AbsoluteTimeControlType = {
    type: 'absolute';
    options: AbsoluteTimeControlOptions;
};

type FischerTimeControlType = {
    type: 'fischer';
    options: FischerTimeControlOptions;
};

type SimpleTimeControlType = {
    type: 'simple';
    options: SimpleTimeControlOptions;
};

type ByoYomiTimeControlType = {
    type: 'byoyomi';
    options: ByoYomiTimeControlOptions;
};

type TimeControlType =
    AbsoluteTimeControlType
    | FischerTimeControlType
    | SimpleTimeControlType
    | ByoYomiTimeControlType
;

export const createTimeControl = (timeControlType: TimeControlType): AbstractTimeControl => {
    const { type, options } = timeControlType;

    switch (type) {
        case 'absolute':
            return new AbsoluteTimeControl(options);

        case 'simple':
            return new SimpleTimeControl(options);

        case 'fischer':
            return new FischerTimeControl(options);

        case 'byoyomi':
            return new ByoYomiTimeControl(options);
    }
};

export default TimeControlType;
