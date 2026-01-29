import GameView from '../GameView.js';

export class ShadingPatternFacade
{
    constructor(
        gameView: GameView,
    ) {
        gameView.getHex('b3').setCellShading(1);
        gameView.getHex('e5').setCellShading(0.5);
    }
}
