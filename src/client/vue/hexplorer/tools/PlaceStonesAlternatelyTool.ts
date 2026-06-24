import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';
import { UndoableAction } from '../undoredo/undoredo.js';
import { HexplorerState } from '../HexplorerState.js';

export class PlaceStonesAlternatelyTool implements ToolInterface
{
    constructor(
        private gameView: GameView,
        private state: HexplorerState,
    ) {}

    createUndoableAction(move: Move): UndoableAction
    {
        const previousStone = this.gameView.getStone(move)?.getPlayerIndex() ?? null;
        const previousCurrentPlayer = this.state.currentPlayer;

        return {
            do: () => {
                this.gameView.setStone(move, this.state.currentPlayer);
                this.state.currentPlayer = 1 - this.state.currentPlayer as 0 | 1;
            },
            undo: () => {
                this.gameView.setStone(move, previousStone);
                this.state.currentPlayer = previousCurrentPlayer;
            },
        };
    }
}
