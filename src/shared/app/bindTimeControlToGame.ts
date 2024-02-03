import { inspect } from 'util';
import { Game, PlayerIndex } from '../game-engine';
import { AbstractTimeControl } from '../time-control/TimeControl';

/**
 * Connect a TimeControl to a Game
 * to allow timeControl switch when player moved,
 * or make game end by time when timeControl emitted elapsed event.
 */
export const bindTimeControlToGame = (game: Game, timeControl: AbstractTimeControl) => {
    game.prependListener('played', (move, moveIndex, byPlayerIndex) => {
        timeControl.push(byPlayerIndex);
    });

    game.prependListener('ended', () => {
        timeControl.finish();
    });

    const onElapsed = (playerLostByTime: PlayerIndex) => {
        if (playerLostByTime !== game.getCurrentPlayerIndex()) {
            throw new Error('player lose by time is not the one playing…');
        }

        game.loseByTime();
    };

    if ('elapsed' === timeControl.getState()) {
        onElapsed(timeControl.getStrictElapsedPlayer());
    } else {
        timeControl.on('elapsed', onElapsed);
    }
};
