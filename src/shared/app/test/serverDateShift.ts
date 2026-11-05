import assert from 'assert';
import { describe, it } from 'mocha';
import {
    getMedianShift,
    getNextMeasureDelay,
    SHIFT_STABILITY_THRESHOLD,
    STABLE_MEASURE_INTERVAL,
    UNSTABLE_MEASURE_INTERVAL,
} from '../serverDateShift.js';

describe('serverDateShift', () => {
    describe('getMedianShift', () => {
        it('returns 0 when there is no measure', () => {
            assert.strictEqual(getMedianShift([]), 0);
        });

        it('sorts numerically, not alphabetically', () => {
            assert.strictEqual(getMedianShift([98, 102, 1000, 9, 100]), 100);
        });

        it('handles negative shifts', () => {
            assert.strictEqual(getMedianShift([-5, 20, -100, 3, -30]), -5);
        });

        it('does not change measures order', () => {
            const shifts = [3, 1, 2];

            getMedianShift(shifts);

            assert.deepStrictEqual(shifts, [3, 1, 2]);
        });
    });

    describe('getNextMeasureDelay', () => {
        it('measures again soon while there is not enough measures', () => {
            assert.strictEqual(getNextMeasureDelay([]), UNSTABLE_MEASURE_INTERVAL);
            assert.strictEqual(getNextMeasureDelay([100, 100, 100, 100]), UNSTABLE_MEASURE_INTERVAL);
        });

        it('waits longer when measures are similar', () => {
            assert.strictEqual(getNextMeasureDelay([100, 120, 90, 110, 105]), STABLE_MEASURE_INTERVAL);
        });

        it('measures again soon when one measure is very different', () => {
            assert.strictEqual(getNextMeasureDelay([100, 120, 3000, 110, 105]), UNSTABLE_MEASURE_INTERVAL);
            assert.strictEqual(getNextMeasureDelay([100, 120, -3000, 110, 105]), UNSTABLE_MEASURE_INTERVAL);
        });

        it('considers a measure similar up to the threshold', () => {
            assert.strictEqual(
                getNextMeasureDelay([0, 0, 0, 0, SHIFT_STABILITY_THRESHOLD]),
                STABLE_MEASURE_INTERVAL,
            );

            assert.strictEqual(
                getNextMeasureDelay([0, 0, 0, 0, SHIFT_STABILITY_THRESHOLD + 1]),
                UNSTABLE_MEASURE_INTERVAL,
            );
        });
    });
});
