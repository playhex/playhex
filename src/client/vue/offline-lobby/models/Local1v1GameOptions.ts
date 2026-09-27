import TimeControlType from '../../../../shared/time-control/TimeControlType.js';

export class Local1v1GameOptions
{
    boardsize: number = 11;

    swapRule: boolean = true;

    /**
     * null for no time control.
     */
    timeControl: null | TimeControlType = null;

    /**
     * Tabletop mode: header hidden, top player displayed upside down.
     */
    tabletop: boolean = false;
}
