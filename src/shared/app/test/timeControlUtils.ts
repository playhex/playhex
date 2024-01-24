/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it } from 'mocha';
import assert from 'assert';
import { calcAverageSecondsPerMove } from '../timeControlUtils';

describe('timeControlUtils', () => {
    it('calculates average seconds per move for a given time control and a board size', () => {
        /**
         * Simple
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'simple',
                options: {
                    secondsPerMove: 12,
                },
            }, 13),
            12,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'simple',
                options: {
                    secondsPerMove: 12,
                },
            }, 7),
            12,
        );

        /**
         * Absolute
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'absolute',
                options: {
                    secondsPerPlayer: 36
                },
            }, 6),
            6,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'absolute',
                options: {
                    secondsPerPlayer: 360
                },
            }, 12),
            15,
        );

        /**
         * Fischer
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'fischer',
                options: {
                    initialSeconds: 300,
                    incrementSeconds: 10,
                },
            }, 6),
            60,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'fischer',
                options: {
                    initialSeconds: 300,
                    incrementSeconds: 1,
                },
            }, 12),
            13.5,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'fischer',
                options: {
                    initialSeconds: 0,
                    incrementSeconds: 1,
                },
            }, 12),
            1,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'fischer',
                options: {
                    initialSeconds: 240,
                },
            }, 12),
            10,
        );

        /**
         * Byo Yomi
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'byoyomi',
                options: {
                    initialSeconds: 100,
                    periodsCount: 2,
                    periodSeconds: 20,
                },
            }, 6),
            40,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'byoyomi',
                options: {
                    initialSeconds: 300,
                    periodsCount: 4,
                    periodSeconds: 10,
                },
            }, 12),
            23.75,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'byoyomi',
                options: {
                    initialSeconds: 0,
                    periodsCount: 1,
                    periodSeconds: 12,
                },
            }, 12),
            12,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'byoyomi',
                options: {
                    initialSeconds: 0,
                    periodsCount: 3,
                    periodSeconds: 12,
                },
            }, 12),
            13,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                type: 'byoyomi',
                options: {
                    initialSeconds: 240,
                    periodsCount: 0,
                    periodSeconds: 12,
                },
            }, 12),
            10,
        );
    });
});
