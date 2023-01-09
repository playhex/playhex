import { Game, Move } from '@shared/game-engine';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';
import Player from '@shared/game-engine/Player';

export default class PlayerGameInputMoveController implements MoveControllerInterface
{
    constructor(
        private player: Player,
    ) {}

    move(game: Game, move: Move): void
    {
        this.player.move(move);
    }
}
