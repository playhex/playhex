import { Move, parseMove } from '../../move-notation/move-notation.js';
import { HexMove, isSpecialHexMove } from '../../move-notation/hex-move-notation.js';
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
    markLastMove(move: HexMove): void
    {
        this.hideMarks();

        if (isSpecialHexMove(move)) {
            return;
        }

        this.lastMoveMark
            .setCoords(parseMove(move))
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
            .setCoords(parseMove(move))
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
            .setCoords(parseMove(move))
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

    /**
     * Hide or show last move marks,
     * but keep updating them when using mark*() methods.
     */
    setVisible(visible = true): void
    {
        this.gameView.getGroup(MARKS_GROUP).visible = visible;
    }
}
