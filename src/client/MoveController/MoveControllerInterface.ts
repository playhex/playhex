import { Game, Move } from '@shared/game-engine';

export default interface MoveControllerInterface
{
    move(game: Game, move: Move): void;
}
