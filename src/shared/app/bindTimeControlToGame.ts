import { Game, PlayerIndex } from "../game-engine";
import { OutcomePrecision } from "../game-engine/Game";
import { TimeControlInterface } from "../time-control/TimeControlInterface";

/**
 * Connect a TimeControl to a Game
 * to allow timeControl switch when player moved,
 * or make game end by time when timeControl emitted elapsed event.
 */
export const bindTimeControlToGame = (game: Game, timeControl: TimeControlInterface) => {
    game.prependListener('started', () => {
        timeControl.start();
    });

    game.prependListener('played', (move, byPlayerIndex) => {
        timeControl.push(byPlayerIndex);
    });

    game.prependListener('ended', (winner: PlayerIndex, outcomePrecision: OutcomePrecision) => {
        timeControl.finish();
    });

    timeControl.on('elapsed', (playerLostByTime: PlayerIndex) => {
        if (playerLostByTime !== game.getCurrentPlayerIndex()) {
            throw new Error('player lose by time is not the one playing...');
        }

        game.loseByTime();
    });
};
