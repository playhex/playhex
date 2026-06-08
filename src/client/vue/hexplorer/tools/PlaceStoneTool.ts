import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';

export class PlaceStoneTool implements ToolInterface
{
    constructor(
        private gameView: GameView,
        private color: 0 | 1,
    ) {}

    createUndoableAction(move: Move): UndoableAction
    {
        const previousStone = this.gameView.getStone(move)?.getPlayerIndex() ?? null;

        return {
            do: () => {
                this.gameView.setStone(move, this.color);
            },
            undo: () => {
                this.gameView.setStone(move, previousStone);
            },
        };
    }
}
