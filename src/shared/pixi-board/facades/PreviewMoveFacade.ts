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
    private previewedMove: null | Move = null;
    private swapped: null | Move = null;

    constructor(
        private gameView: GameView,
    ) {}

    /**
     * Show a faded stone.
     * If used for previewing a move (i.e before confirm, or premove),
     * use `swapped` argument if this is a swap move
     * to hide it and preview how move will be swapped.
     *
     * Only preview one move. Previewing another move will can current preview.
     */
    preview(move: Move, byPlayerIndex: 0 | 1, swapped: null | Move = null): void
    {
        this.cancelPreview();

        if (move === 'pass') {
            return;
        }

        this.previewedMove = move;
        this.swapped = swapped;

        this.gameView.setStone(move, byPlayerIndex, true);

        if (swapped) {
            this.gameView.setStone(swapped, null);
        }
    }

    hasPreview(): boolean
    {
        return this.previewedMove !== null;
    }

    /**
     * Remove previewed moves and restore stones.
     * Should be called when previewed move is canceled, or played,
     * or another move has been played.
     */
    cancelPreview(): void
    {
        if (this.previewedMove) {
            this.gameView.setStone(this.previewedMove, null);
            this.previewedMove = null;
        }

        if (this.swapped) {
            this.gameView.setStone(this.swapped, 0);
            this.swapped = null;
        }
    }
}
