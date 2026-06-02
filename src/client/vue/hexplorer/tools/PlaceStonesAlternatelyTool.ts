import { GameView } from '@playhex/pixi-board';
import { Move } from '../../../../shared/move-notation/move-notation.js';
import { ToolInterface } from './ToolInterface.js';

export class PlaceStonesAlternatelyTool implements ToolInterface
{
    private currentColor: 0 | 1;

    constructor(
        private gameView: GameView,
        initialColor: 0 | 1 = 0,
    ) {
        this.currentColor = initialColor;
    }

    apply(move: Move): void
    {
        this.gameView.setStone(move, this.currentColor);
        this.currentColor = 1 - this.currentColor as 0 | 1;
    }
}
