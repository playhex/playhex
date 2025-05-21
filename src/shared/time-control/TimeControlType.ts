import { ByoYomiTimeControlOptions } from './time-controls/ByoYomiTimeControl.js';
import { FischerTimeControlOptions } from './time-controls/FischerTimeControl.js';

type FischerTimeControlType = {
    family: 'fischer';
    options: FischerTimeControlOptions;
};

type ByoYomiTimeControlType = {
    family: 'byoyomi';
    options: ByoYomiTimeControlOptions;
};

type TimeControlType =
    | FischerTimeControlType
    | ByoYomiTimeControlType
;

export default TimeControlType;
