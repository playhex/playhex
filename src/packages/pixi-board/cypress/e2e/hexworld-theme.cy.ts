import GameView from '../../GameView.js';
import { ShadingPatternFacade } from '../../facades/ShadingPatternFacade.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { hexworldTheme } from '../../themes/hexworld/index.js';

describe('HexWorld theme visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('renders framed board, stones, coords and shading pattern', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(7, {
                theme: resolveTheme(hexworldTheme, 'dark'),
                orientation: GameView.ORIENTATION_FLAT,
                displayCoords: true,
            });

            new ShadingPatternFacade(gameView).setShadingPattern('concentrical_rings');

            gameView.setStone('a1', 1);
            gameView.setStone('d4', 0);
            gameView.setStone('e4', 1);
            gameView.setStone('g7', 0);
            gameView.setStone('c5', 0, true);

            await mountGameView(gameView);

            cy.compareSnapshot('framed-board');
        });
    });
});
