import { Coords, coordsToMove, Move } from '../../move-notation/move-notation.js';
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
     * Animate a stone.
     *
     * @param move Which cell to animate (ex: "d4")
     * @param delay In milliseconds, wait before animate
     */
    async animateStone(coords: Move | Coords, delay = 0): Promise<void>
    {
        if (typeof coords !== 'string') {
            coords = coordsToMove(coords);
        }

        const stone = this.gameView.getStone(coords);

        if (!stone) {
            return;
        }

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        await stone.animate();
    }

    /**
     * Animate a path of coords.
     * Promises resolve when animation is over.
     *
     * Animation can break if GameView is redrawn while animation is playing.
     */
    async animatePath(moves: (Move | Coords)[]): Promise<void>
    {
        const promises = moves.map(async (move, i): Promise<void> => {
            await this.animateStone(move, i * 80);
        });

        await Promise.all(promises);
    }
}
