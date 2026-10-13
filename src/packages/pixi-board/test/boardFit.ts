import assert from 'assert';
import { computeBoardFit } from '../boardFit.js';

const { PI } = Math;

const assertClose = (actual: number, expected: number): void => {
    assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);
};

describe('computeBoardFit', () => {
    it('centers and scales discs to fit wrapper', () => {
        const { scale, pivot } = computeBoardFit(
            [{ x: 0, y: 0, radius: 10 }, { x: 80, y: 0, radius: 10 }],
            0,
            { width: 200, height: 200 },
        );

        assertClose(scale, 2); // 100 wide in a 200 wrapper
        assertClose(pivot.x, 40);
        assertClose(pivot.y, 0);
    });

    it('fits on the smallest wrapper dimension', () => {
        const { scale } = computeBoardFit(
            [{ x: 0, y: 0, radius: 50 }],
            0,
            { width: 300, height: 100 },
        );

        assertClose(scale, 1);
    });

    it('takes rotation into account, pivot stays in board coordinates', () => {
        const { scale, pivot } = computeBoardFit(
            [{ x: 0, y: 0, radius: 10 }, { x: 80, y: 0, radius: 10 }],
            PI / 2,
            { width: 200, height: 100 },
        );

        // Rotated, board is 100 high in a 100 high wrapper
        assertClose(scale, 1);
        assertClose(pivot.x, 40);
        assertClose(pivot.y, 0);
    });
});
