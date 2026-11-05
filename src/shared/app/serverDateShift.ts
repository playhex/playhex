/**
 * How many last measured shifts are kept to get a median value.
 */
export const MAX_MEASURES = 5;

/**
 * Delay in milliseconds before next measure
 * while we have not enough measures, or they are too different.
 */
export const UNSTABLE_MEASURE_INTERVAL = 5000;

/**
 * Delay in milliseconds before next measure when last measures are similar.
 */
export const STABLE_MEASURE_INTERVAL = 60000;

/**
 * Max difference in milliseconds between a measure and the median to consider it similar.
 * Measures include network latency, so a too low value would never be stable on mobile networks.
 */
export const SHIFT_STABILITY_THRESHOLD = 500;

/**
 * Get median of measured shifts, in milliseconds. 0 if no measure yet.
 */
export const getMedianShift = (shifts: number[]): number => {
    if (shifts.length === 0) {
        return 0;
    }

    const sorted = [...shifts].sort((a, b) => a - b);

    return sorted[Math.floor(shifts.length / 2)];
};

/**
 * Get delay in milliseconds to wait before measuring shift again.
 */
export const getNextMeasureDelay = (shifts: number[]): number => {
    if (shifts.length < MAX_MEASURES) {
        return UNSTABLE_MEASURE_INTERVAL;
    }

    const median = getMedianShift(shifts);
    const isStable = shifts.every(shift => Math.abs(shift - median) <= SHIFT_STABILITY_THRESHOLD);

    return isStable
        ? STABLE_MEASURE_INTERVAL
        : UNSTABLE_MEASURE_INTERVAL
    ;
};
