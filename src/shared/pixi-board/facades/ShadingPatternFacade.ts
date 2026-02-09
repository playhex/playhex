import { createShadingPattern, ShadingPatternType } from '../shading-patterns/shading-patterns.js';
import GameView from '../GameView.js';

/**
 * A facade to help set and change game view shading pattern.
 */
export class ShadingPatternFacade
{
    constructor(
        private gameView: GameView,
    ) {}

    setShadingPattern(name: ShadingPatternType, intensity = 0.5, options: unknown = null): void
    {
        const shadingPattern = createShadingPattern(name, options);
        const size = this.gameView.getBoardsize();

        for (let row = 0; row < size; ++row) {
            for (let col = 0; col < size; ++col) {
                this.gameView
                    .getHexByCoords({ row, col })
                    .setCellShading(shadingPattern.calc(row, col, size) * intensity);
                ;
            }
        }
    }
}
