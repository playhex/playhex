import { describe, it } from 'mocha';
import { createTimeControl } from '../createTimeControl';
import assert from 'assert';

describe('createTimeControl', () => {
    it('creates elapsed time control and set elapsedPlayer', () => {
        const timeControl = createTimeControl(
            {
                type: 'fischer',
                options: { initialTime: 5000, timeIncrement: 3000, maxTime: 5000 },
            },
            {
                state: 'elapsed',
                currentPlayer: 0,
                players: [{ totalRemainingTime: 0 }, { totalRemainingTime: 5000 }],
            },
        );

        assert.strictEqual(timeControl.getStrictElapsedPlayer(), 0);
    });
});
