import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';

export class PlaceStoneTool implements ToolInterface
{
    constructor(
        private gameView: GameView,
        private color: 0 | 1,
    ) {}

    apply(move: Move): void
    {
        this.gameView.setStone(move, this.color);
    }
}
