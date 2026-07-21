import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export class PlaceStoneTool implements ToolInterface
{
    constructor(
        private gameView: GameView,
        readonly color: 0 | 1,
    ) {}

    /**
     * Color of the stone currently on this cell, if any.
     */
    private stoneAt(move: Move): null | 0 | 1
    {
        return this.gameView.getStone(move)?.getPlayerIndex() ?? null;
    }

    createUndoableAction(move: Move): UndoableAction | null
    {
        const existing = this.stoneAt(move);

        if (existing !== null && existing !== this.color) {
            return null;
        }

        const toggling = existing === this.color;

        return {
            do: () => {
                this.gameView.setStone(move, toggling ? null : this.color);
            },
            undo: () => {
                this.gameView.setStone(move, toggling ? this.color : null);
            },
        };
    }

    getDragMode(move: Move): 'add' | 'remove' | null
    {
        const existing = this.stoneAt(move);

        if (existing !== null && existing !== this.color) return null; // opponent stone: no drag

        return existing === this.color ? 'remove' : 'add';
    }

    createDragAction(move: Move, mode: 'add' | 'remove'): UndoableAction | null
    {
        const existing = this.stoneAt(move);

        if (mode === 'add') {
            if (existing !== null) return null; // skip occupied cells

            return {
                do: () => this.gameView.setStone(move, this.color),
                undo: () => this.gameView.setStone(move, null),
            };
        }

        if (existing !== this.color) return null; // skip cells without this color

        return {
            do: () => this.gameView.setStone(move, null),
            undo: () => this.gameView.setStone(move, this.color),
        };
    }
}
