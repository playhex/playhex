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
     * Only preview one move. Previewing another move will cancel current preview.
     *
     * Cannot preview "swap-move" because this class has no idea what is first move.
     * Must pass move after swap, and move before swap as arguments.
     */
    preview(move: Move, byPlayerIndex: 0 | 1, swapped: null | Move = null): void
    {
        this.cancelPreview();

        this.previewedMove = move;
        this.swapped = swapped;

        // To do before move, in case move and swapped are on same cell (when played on long diagonal)
        if (swapped) {
            this.gameView.setStone(swapped, null);
        }

        this.gameView.setStone(move, byPlayerIndex, true);
    }

    hasPreview(): boolean
    {
        return this.previewedMove !== null;
    }

    getPreview(): null | Move
    {
        return this.previewedMove;
    }

    /**
     * Remove previewed moves and restore stones.
     * Should be called when previewed move is canceled, or played,
     * or another move has been played.
     *
     * @returns Cells that have been cleared.
     *      Used to check if we need to replace a stone that was here, or is now here.
     */
    cancelPreview(): Move[]
    {
        const clearedMoves: Move[] = [];

        if (this.previewedMove) {
            this.gameView.setStone(this.previewedMove, null);
            clearedMoves.push(this.previewedMove);
            this.previewedMove = null;
        }

        if (this.swapped) {
            this.gameView.setStone(this.swapped, 0);
            clearedMoves.push(this.swapped);
            this.swapped = null;
        }

        return clearedMoves;
    }
}
