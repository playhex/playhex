import { Move, moveToCoords } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';
import SwappableMark from '../../pixi-board/marks/SwappableMark.js';
import SwappedMark from '../../pixi-board/marks/SwappedMark.js';
import LastMoveMark from '../../pixi-board/marks/LastMoveMark.js';

const MARKS_GROUP = '_game_marks';

/**
 * Set of marks useful for a game:
 * - last move
 * - swap/swapped
 *
 * Swap marks do not appear simultaneously with the last move mark.
 */
export class GameMarksFacade
{
    private lastMoveMark = new LastMoveMark();
    private swappableMark = new SwappableMark();
    private swappedMark = new SwappedMark();

    constructor(
        private gameView: GameView,
    ) {
        this.hideMarks();

        this.gameView.addMark(this.lastMoveMark, MARKS_GROUP);
        this.gameView.addMark(this.swappableMark, MARKS_GROUP);
        this.gameView.addMark(this.swappedMark, MARKS_GROUP);
    }

    /**
     * This stone is the lastly played
     */
    markLastMove(move: Move): void
    {
        this.hideMarks();

        if (move === 'pass') {
            return;
        }

        this.lastMoveMark
            .setCoords(moveToCoords(move))
            .show()
        ;
    }

    /**
     * This stone can be swapped
     */
    markSwappable(move: Move): void
    {
        this.hideMarks();

        this.swappableMark
            .setCoords(moveToCoords(move))
            .show()
        ;
    }

    /**
     * This stone has been swapped
     */
    markSwapped(move: Move): void
    {
        this.hideMarks();

        this.swappedMark
            .setCoords(moveToCoords(move))
            .show()
        ;
    }

    /**
     * Hide the mark that is currently displayed
     */
    hideMarks(): void
    {
        this.lastMoveMark.hide();
        this.swappableMark.hide();
        this.swappedMark.hide();
    }
}