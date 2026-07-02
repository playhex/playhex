// just a copy from timeControlsUtils, used for cypress tests,
// to not break all tests when we add a new time in array, and makes slider shift.

export const liveInitialTimeSteps: number[] = [
    5 * 1000,
    10 * 1000,
    15 * 1000,
    30 * 1000,
    45 * 1000,
    60 * 1000,
    90 * 1000,
    60 * 2 * 1000,
    60 * 3 * 1000,
    60 * 4 * 1000,
    60 * 5 * 1000,
    60 * 7 * 1000,
    60 * 10 * 1000,
    60 * 12 * 1000,
    60 * 15 * 1000,
    60 * 20 * 1000,
    60 * 25 * 1000,
    60 * 30 * 1000,
    60 * 40 * 1000,
    60 * 45 * 1000,
    60 * 60 * 1000,
    60 * 75 * 1000,
    60 * 90 * 1000,
    60 * 120 * 1000,
    60 * 150 * 1000,
    60 * 180 * 1000,
];

export const correspondenceInitialTimeSteps: number[] = [
    86400 * 1 * 1000,
    86400 * 2 * 1000,
    86400 * 3 * 1000,
    86400 * 5 * 1000,
    86400 * 7 * 1000,
    86400 * 10 * 1000,
    86400 * 14 * 1000,
];

export const liveSecondaryTimeSteps: number[] = [
    0 * 1000,
    1 * 1000,
    2 * 1000,
    3 * 1000,
    4 * 1000,
    5 * 1000,
    6 * 1000,
    7 * 1000,
    8 * 1000,
    9 * 1000,
    10 * 1000,
    12 * 1000,
    15 * 1000,
    20 * 1000,
    25 * 1000,
    30 * 1000,
    40 * 1000,
    45 * 1000,
    60 * 1000,
    75 * 1000,
    90 * 1000,
    120 * 1000,
    150 * 1000,
    180 * 1000,
];

export const correspondenceSecondaryTimeSteps: number[] = [
    86400 * 1 * 1000,
    86400 * 2 * 1000,
    86400 * 3 * 1000,
    86400 * 5 * 1000,
    86400 * 7 * 1000,
    86400 * 10 * 1000,
    86400 * 14 * 1000,
];

const multipliers = {
    s: 1000,
    min: 60000,
    h: 3600000,
    d: 86400000,
};

export const toMs = (value: number, unit: 's' | 'min' | 'h' | 'd'): number => value * multipliers[unit];
