import { Game, Move } from '@shared/game-engine';
import ClientPlayer from '../ClientPlayer';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';

export default class RemotePlayMoveController implements MoveControllerInterface
{
    move(game: Game, move: Move): void
    {
        const currentPlayer = game.getCurrentPlayer();

        if (!(currentPlayer instanceof ClientPlayer)) {
            throw new Error('Expected a ClientPlayer here');
        }

        // Ignore move if current player is not me
        if (!currentPlayer.isLocal()) {
            return;
        }

        currentPlayer.move(move);
    }
}
