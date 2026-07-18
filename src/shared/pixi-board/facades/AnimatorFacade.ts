import { Coords, coordsToMove, Move } from '../../move-notation/move-notation.js';
import LastMoveMark from '../entities/LastMoveMark.js';
import GameView from '../GameView.js';

/**
 * Animate a path by animating a list of cells.
 * Can be used to animate winning path when game ended by connecting sides.
 */
export class AnimatorFacade
{
    static GROUP_ANIMATE_PATH = 'animate_path_group';

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
     * Animate a path of coords, one cell at a time, staggered by delay.
     * Promises resolve when animation is over.
     *
     * Animation can break if GameView is redrawn while animation is playing.
     */
    async animatePath(moves: (Move | Coords)[]): Promise<void>
    {
        await this.animatePathGroups(moves.map(move => [move]));
    }

    /**
     * Animate a path of coords grouped by "layer": all cells within a group
     * are animated in parallel, and each group starts after a short delay
     * relative to the previous one. Useful to animate a winning path fanning
     * out from a junction cell to the sides on multiple legs at once.
     *
     * Promises resolve when animation is over.
     *
     * Animation can break if GameView is redrawn while animation is playing.
     */
    async animatePathGroups(groups: (Move | Coords)[][]): Promise<void>
    {
        const promises = groups.map(async (group, i): Promise<void> => {
            await Promise.all(group.map(move => this.animateStone(move, i * 80)));

            group.forEach(move => {
                this.gameView
                    .addEntity(new LastMoveMark(), AnimatorFacade.GROUP_ANIMATE_PATH)
                    .setCoords(move)
                ;
            });
        });

        await Promise.all(promises);
    }

    clearAnimatePathMarks(): void
    {
        this.gameView.removeEntitiesGroup(AnimatorFacade.GROUP_ANIMATE_PATH);
    }

    hideAnimatePathMarks(): void
    {
        this.gameView.getGroup(AnimatorFacade.GROUP_ANIMATE_PATH).visible = false;
    }

    showAnimatePathMarks(): void
    {
        this.gameView.getGroup(AnimatorFacade.GROUP_ANIMATE_PATH).visible = true;
    }
}
