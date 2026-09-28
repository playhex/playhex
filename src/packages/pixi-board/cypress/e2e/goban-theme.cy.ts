import { Assets } from 'pixi.js';
import GameView from '../../GameView.js';
import { ShadingPatternFacade } from '../../facades/ShadingPatternFacade.js';
import { Anchor44Facade } from '../../facades/Anchor44Facade.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { gobanTheme } from '../../themes/goban/index.js';

// Board image url, as resolved by cypress webpack bundler, is not served.
// Load it from visual test server instead.
Assets.add({
    alias: new URL('../../themes/goban/oak-wood.jpg', import.meta.url).href,
    src: '/themes/goban/oak-wood.jpg',
});

describe('Goban theme visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('renders stones on intersections, corners and edges', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, { theme: resolveTheme(gobanTheme, 'dark') });

            gameView.setStone('b2', 0);
            gameView.setStone('c3', 1);
            gameView.setStone('d3', 0, true);

            // on corners and edges
            gameView.setStone('a1', 1);
            gameView.setStone('e1', 0);
            gameView.setStone('e5', 1);
            gameView.setStone('a4', 0);

            await mountGameView(gameView);

            cy.compareSnapshot('stones');
        });
    });

    it('renders 4-4 anchors with lines color', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(9, { theme: resolveTheme(gobanTheme, 'dark') });

            new Anchor44Facade(gameView);
            gameView.setStone('d4', 0);

            await mountGameView(gameView);

            cy.compareSnapshot('anchors-44');
        });
    });

    it('renders coords, shading pattern and highlighted sides in light mode', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, {
                theme: resolveTheme(gobanTheme, 'light'),
                displayCoords: true,
            });

            new ShadingPatternFacade(gameView).setShadingPattern('tricolor_checkerboard');
            gameView.highlightSideForPlayer(1);
            gameView.setStone('c3', 0);

            await mountGameView(gameView);

            cy.compareSnapshot('coords-shading-light');
        });
    });
});
