import { Assets } from 'pixi.js';
import GameView from '../../GameView.js';
import { CellsMask } from '../../cells-mask/CellsMask.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { gobanTheme } from '../../themes/goban/index.js';
import { playhexTheme } from '../../themes/playhex/index.js';
import { ShadingPatternFacade } from '../../shading-patterns/ShadingPatternFacade.js';
import TriangleMark from '../../entities/TriangleMark.js';

// Board image url, as resolved by cypress webpack bundler, is not served.
// Load it from visual test server instead.
Assets.add({
    alias: new URL('../../themes/goban/oak-wood.jpg', import.meta.url).href,
    src: '/themes/goban/oak-wood.jpg',
});

/**
 * Cells of a corner of the board, i.e for a puzzle.
 */
const corner = (size: number, boardsize: number): { row: number, col: number }[] => {
    const cells = [];

    for (let row = boardsize - size; row < boardsize; ++row) {
        for (let col = 0; col < size; ++col) {
            cells.push({ row, col });
        }
    }

    return cells;
};

describe('Partial board visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('hides some inner, edge and corner cells, with their stones and marks', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(7, {
                cellsMask: CellsMask.hiding(7, ['d4', 'a1', 'c1', 'g4', 'g7', 'e5']),
            });

            gameView.setStone('d4', 0); // hidden
            gameView.setStone('c4', 1);
            gameView.setStone('e5', 1); // hidden
            gameView.addEntity(new TriangleMark().setCoords('d4')); // hidden

            new ShadingPatternFacade(gameView).setShadingPattern('tricolor_checkerboard');

            await mountGameView(gameView);

            cy.compareSnapshot('hidden-cells');
        });
    });

    it('displays only a corner of the board, zoomed, with coords', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(13, {
                cellsMask: CellsMask.showingOnly(13, corner(5, 13)),
                displayCoords: true,
            });

            gameView.setStone('b11', 0);
            gameView.setStone('c12', 1);
            gameView.setStone('a1', 0); // hidden

            await mountGameView(gameView);

            cy.compareSnapshot('corner-with-coords');
        });
    });

    it('displays only a corner of the board in flat orientation', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(13, {
                cellsMask: CellsMask.showingOnly(13, corner(5, 13)),
                orientation: GameView.ORIENTATION_FLAT,
                theme: resolveTheme(playhexTheme, 'light'),
            });

            await mountGameView(gameView);

            cy.compareSnapshot('corner-flat-light');
        });
    });

    it('displays partial goban, without lines to hidden intersections', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(9, {
                theme: resolveTheme(gobanTheme, 'dark'),
                cellsMask: CellsMask.showingOnly(9, [...corner(4, 9), { row: 4, col: 4 }]),
            });

            gameView.setStone('a9', 0);
            gameView.setStone('b8', 1);

            await mountGameView(gameView);

            cy.compareSnapshot('goban-corner');
        });
    });

    it('displays whole board again when mask removed', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5);

            gameView.setCellsMask(CellsMask.showingOnly(5, ['a1', 'b1']));
            gameView.setStone('c3', 0);

            await mountGameView(gameView);

            gameView.setCellsMask(CellsMask.all(5));

            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

            cy.compareSnapshot('mask-removed');
        });
    });

    it('displays only a ziggurat on bottom edge, with a stone on top', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(9, {
                orientation: GameView.ORIENTATION_FLAT,
                cellsMask: CellsMask.showingOnly(9, [
                    'e7', 'f7',
                    'd8', 'e8', 'f8',
                    'c9', 'd9', 'e9', 'f9',
                ]),
            });

            gameView.setStone('e7', 0);

            await mountGameView(gameView);

            cy.compareSnapshot('ziggurat');
        });
    });
});
