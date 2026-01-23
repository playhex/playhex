import { Move } from '../../move-notation/move-notation.js';
import GameView from '../GameView.js';

/**
 * Display a single faded stone.
 * Useful to preview a move before confirm,
 * or to display a premove.
 *
 * Can fade another stone in case we need to preview a swap move.
 */
export class PreviewMoveFacade
{
    constructor(
        private gameView: GameView,
    ) {}

    preview(move: Move, byPlayerIndex: 0 | 1, swapped: null | Move = null): void
    {
        this.gameView.setStone(move, byPlayerIndex);
    }
}
