import { Coords, Move } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';

/**
 * Animate a path by animating a list of cells.
 * Can be used to animate winning path when game ended by connecting sides.
 */
export class AnimatorFacade
{
    constructor(
        private gameView: GameView,
    ) {}

    /**
     * Animate a path of coords.
     * Promises resolve when animation is over.
     *
     * Animation can break if GameView is redrawn while animation is playing.
     */
    async animatePath(moves: (Move | Coords)[]): Promise<void>
    {
        const promises = moves.map(async (move, i): Promise<void> => {
            await this.gameView.animateStone(move, i * 80);
        });

        await Promise.all(promises);
    }
}
