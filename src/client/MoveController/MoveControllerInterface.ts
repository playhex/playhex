import { Game, Move } from '@shared/game-engine';

/**
 * Provided to a GameView, calls move() after a click on a cell.
 */
export default interface MoveControllerInterface
{
    move(game: Game, move: Move): void;
}
