import { Game, Move } from '@shared/game-engine';
import ClientPlayer from '@client/ClientPlayer';
import MoveControllerInterface from '@client/MoveController/MoveControllerInterface';

export default class RemotePlayMoveController implements MoveControllerInterface
{
    constructor(
        private player: ClientPlayer,
    ) {}

    move(game: Game, move: Move): void
    {
        this.player.move(move);
    }
}
