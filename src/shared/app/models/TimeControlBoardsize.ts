import TimeControlType from '../../time-control/TimeControlType.js';

/**
 * Required parameters to compute time control cadency.
 */
export type TimeControlBoardsize = {
    timeControlType: TimeControlType;
    boardsize: number;
};
