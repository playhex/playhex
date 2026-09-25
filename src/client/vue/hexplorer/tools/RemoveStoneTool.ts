import { GameView } from '@playhex/pixi-board';
import { Move } from '@playhex/move-notation';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export class RemoveStoneTool implements ToolInterface
{
    constructor(
        private gameView: GameView,
    ) {}

    createUndoableAction(move: Move): UndoableAction | null
    {
        const previousStone = this.gameView.getStone(move)?.getPlayerIndex() ?? null;

        if (previousStone === null) {
            return null;
        }

        return {
            do: () => {
                this.gameView.setStone(move, null);
            },
            undo: () => {
                this.gameView.setStone(move, previousStone);
            },
        };
    }

    getDragMode(): 'remove'
    {
        return 'remove';
    }

    createDragAction(move: Move): UndoableAction | null
    {
        return this.createUndoableAction(move);
    }
}
