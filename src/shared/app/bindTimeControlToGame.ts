import { Game, PlayerIndex } from '../game-engine/index.js';
import { AbstractTimeControl } from '../time-control/TimeControl.js';

/**
 * Connect a TimeControl to a Game
 * to allow timeControl switch when player moved,
 * or make game end by time when timeControl emitted elapsed event.
 */
export const bindTimeControlToGame = (game: Game, timeControl: AbstractTimeControl) => {
    game.prependListener('played', (move, moveIndex, byPlayerIndex) => {
        // Start time control on first move
        if (timeControl.getState() === 'ready') {
            timeControl.start(move.getPlayedAt());
        }

        timeControl.push(byPlayerIndex, move.getPlayedAt());
    });

    game.prependListener('ended', (winner, outcome, date) => {
        timeControl.finish(date);
    });

    game.prependListener('canceled', (date) => {
        timeControl.finish(date);
    });

    // When instanciating a game from data, but chrono elapsed before instanciating (i.e while offline)
    const onElapsed = (playerLostByTime: PlayerIndex, date: Date) => {
        if (playerLostByTime !== game.getCurrentPlayerIndex()) {
            throw new Error('player lose by time is not the one playing…');
        }

        if (game.getMovesHistory().length < 2) {
            game.cancel(date);
        } else {
            game.loseByTime(date);
        }
    };

    if ('elapsed' === timeControl.getState()) {
        onElapsed(timeControl.getStrictElapsedPlayer(), timeControl.getStrictElapsedAt());
    } else {
        timeControl.on('elapsed', onElapsed);
    }
};
