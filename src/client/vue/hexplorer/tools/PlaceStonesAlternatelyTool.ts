import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export class PlaceStonesAlternatelyTool implements ToolInterface
{
    private currentColor: 0 | 1;

    constructor(
        private gameView: GameView,
        initialColor: 0 | 1 = 0,
    ) {
        this.currentColor = initialColor;
    }

    createUndoableAction(move: Move): UndoableAction
    {
        const previousStone = this.gameView.getStone(move)?.getPlayerIndex() ?? null;
        const previousCurrentColor = this.currentColor;

        return {
            do: () => {
                this.gameView.setStone(move, this.currentColor);
                this.currentColor = 1 - this.currentColor as 0 | 1;
            },
            undo: () => {
                this.gameView.setStone(move, previousStone);
                this.currentColor = previousCurrentColor;
            },
        };
    }
}
