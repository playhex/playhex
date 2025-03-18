import { ByoYomiTimeControlOptions } from './time-controls/ByoYomiTimeControl.js';
import { FischerTimeControlOptions } from './time-controls/FischerTimeControl.js';

type FischerTimeControlType = {
    type: 'fischer';
    options: FischerTimeControlOptions;
};

type ByoYomiTimeControlType = {
    type: 'byoyomi';
    options: ByoYomiTimeControlOptions;
};

type TimeControlType =
    | FischerTimeControlType
    | ByoYomiTimeControlType
;

export default TimeControlType;
