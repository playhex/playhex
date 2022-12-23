import { Game, IllegalMove, Move } from '../shared/game-engine';
import FrontPlayer from './FrontPlayer';

const localPlay = (game: Game, move: Move) => {
    const currentPlayer = game.getCurrentPlayer();

    console.log('kik hex', currentPlayer.constructor.name, currentPlayer);

    try {
        if (
            !(currentPlayer instanceof FrontPlayer)
            || !currentPlayer.interactive
        ) {
            throw new IllegalMove('not your turn');
        }

        game.checkMove(move);

        console.log('do move', move);

        const moved = currentPlayer.doMove(move);

        if (!moved) {
            throw new IllegalMove('not your turn');
        }
    } catch (e) {
        if (e instanceof IllegalMove) {
            console.error(e.message);
        } else {
            throw e;
        }
    }
};

export {
    localPlay,
};
