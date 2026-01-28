import { Move, moveToCoords } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';
import SwappableMark from '../entities/SwappableMark.js';
import SwappedMark from '../entities/SwappedMark.js';
import LastMoveMark from '../entities/LastMoveMark.js';

const MARKS_GROUP = '_game_marks';

/**
 * Set of marks useful for a game:
 * - last move
 * - swap/swapped
 *
 * Do not duplicate marks, nor make last move mark overlaps swap marks.
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

        this.gameView.addEntity(this.lastMoveMark, MARKS_GROUP);
        this.gameView.addEntity(this.swappableMark, MARKS_GROUP);
        this.gameView.addEntity(this.swappedMark, MARKS_GROUP);
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
