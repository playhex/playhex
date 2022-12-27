import { Game, IllegalMove, Move } from '@shared/game-engine';
import FrontPlayer from '@client/FrontPlayer';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';

export default class LocalPlayMoveController implements MoveControllerInterface
{
    move(game: Game, move: Move): void
    {
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
    }
}
