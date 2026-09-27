import TimeControlType from '../../../shared/time-control/TimeControlType.js';

const MINUTE = 60_000;
const SECOND = 1000;

const fischer = (initialTime: number, timeIncrement: number): TimeControlType => ({
    family: 'fischer',
    options: { initialTime, timeIncrement },
});

/**
 * Time controls selectable for local 1v1 games.
 * null means no time control.
 */
export const localTimeControls: (null | TimeControlType)[] = [
    null,
    fischer(3 * MINUTE, 2 * SECOND),
    fischer(5 * MINUTE, 3 * SECOND),
    fischer(10 * MINUTE, 5 * SECOND),
    fischer(15 * MINUTE, 10 * SECOND),
];
