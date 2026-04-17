import { describe, it } from 'mocha';
import assert from 'assert';
import { calcAverageSecondsPerMove } from '../timeControlUtils.js';

describe('timeControlUtils', () => {
    it('calculates average seconds per move for a given time control and a board size', () => {

        /**
         * Fischer
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'fischer',
                    options: {
                        initialTime: 300000,
                        timeIncrement: 10000,
                    },
                },
                boardsize: 6,
            }),
            60,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'fischer',
                    options: {
                        initialTime: 300000,
                        timeIncrement: 1000,
                    },
                },
                boardsize: 12,
            }),
            13.5,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'fischer',
                    options: {
                        initialTime: 0,
                        timeIncrement: 1000,
                    },
                },
                boardsize: 12,
            }),
            1,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'fischer',
                    options: {
                        initialTime: 240000,
                    },
                },
                boardsize: 12,
            }),
            10,
        );

        /**
         * Byo Yomi
         */
        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 100000,
                        periodsCount: 2,
                        periodTime: 20000,
                    },
                },
                boardsize: 6,
            }),
            40,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 300000,
                        periodsCount: 4,
                        periodTime: 10000,
                    },
                },
                boardsize: 12,
            }),
            23.75,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 0,
                        periodsCount: 1,
                        periodTime: 12000,
                    },
                },
                boardsize: 12,
            }),
            12,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 0,
                        periodsCount: 3,
                        periodTime: 12000,
                    },
                },
                boardsize: 12,
            }),
            13,
        );

        assert.strictEqual(
            calcAverageSecondsPerMove({
                timeControlType: {
                    family: 'byoyomi',
                    options: {
                        initialTime: 240000,
                        periodsCount: 0,
                        periodTime: 12000,
                    },
                },
                boardsize: 12,
            }),
            10,
        );
    });
});
