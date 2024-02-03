import { AbsoluteTimeControlOptions } from './time-controls/AbsoluteTimeControl';
import { ByoYomiTimeControlOptions } from './time-controls/ByoYomiTimeControl';
import { FischerTimeControlOptions } from './time-controls/FischerTimeControl';
import { SimpleTimeControlOptions } from './time-controls/SimpleTimeControl';

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

export default TimeControlType;
