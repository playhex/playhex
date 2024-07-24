import { PlayerIndex } from '../game-engine';
import { createTimeControl } from '../time-control/createTimeControl';
import { AbstractTimeControl, TimeControlError } from '../time-control/TimeControl';
import { HostedGame } from './models';

/**
 * While undoing moves, we need to revert the chrono state like it was before playing undone move(s).
 *
 * This function recreates a time control instance from game moves played at dates history,
 * without N last moves that will be undone.
 *
 * It may be possible that undoing last move will make time control to elapse because of time increment,
 * in this case, it will return null.
 *
 * @param ignoreLastMoves Number of last moves to ignore, because they will be undone
 * @param now "Now" date to use to check if last move is not elapsing
 */
export const recreateTimeControlAfterUndo = (hostedGame: HostedGame, ignoreLastMoves: number, now: Date): null | AbstractTimeControl => {
    const { gameData, gameOptions } = hostedGame;

    if (!gameData) {
        throw new Error('Cannot recreate time control, no gameData on hostedGame');
    }

    try {
        const { movesHistory } = gameData;
        const timeControl = createTimeControl(gameOptions.timeControl);
        const totalMovesCount = movesHistory.length - ignoreLastMoves;

        if (0 === totalMovesCount) {
            return timeControl;
        }

        timeControl.start(movesHistory[0].playedAt, null);

        for (let i = 0; i < totalMovesCount; ++i) {
            const move = movesHistory[i];

            timeControl.push(
                i % 2 as PlayerIndex,
                move.playedAt,
                i < totalMovesCount - 1 ? null : now, // Prevent elapsing while recreating past moves, except last one
            );
        }

        if ('elapsed' === timeControl.getState()) {
            return null;
        }

        return timeControl;
    } catch (e) {
        // TimeControlError is thrown when push while time control has already elapsed
        if (e instanceof TimeControlError) {
            return null;
        }

        throw e;
    }
};
