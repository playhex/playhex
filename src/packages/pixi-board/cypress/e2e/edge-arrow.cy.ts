import GameView from '../../GameView.js';
import EdgeArrowMark from '../../entities/EdgeArrowMark.js';
import { CellsMask } from '../../cells-mask/CellsMask.js';

describe('Edge arrow mark visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('shows stones connected to each edge', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, {
                orientation: GameView.ORIENTATION_FLAT,
            });

            gameView.setStone('c2', 0);
            gameView.setStone('c4', 0);
            gameView.setStone('b3', 1);
            gameView.setStone('d3', 1);

            gameView.addEntity(new EdgeArrowMark('top').setCoords('c2'));
            gameView.addEntity(new EdgeArrowMark('bottom').setCoords('c4'));
            gameView.addEntity(new EdgeArrowMark('left').setCoords('b3'));
            gameView.addEntity(new EdgeArrowMark('right').setCoords('d3'));

            await mountGameView(gameView);

            cy.compareSnapshot('edge-arrows');
        });
    });

    it('shows an arrow on a ziggurat stone, on a partial board', () => {
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
            gameView.addEntity(new EdgeArrowMark('top').setCoords('e7'));

            await mountGameView(gameView);

            cy.compareSnapshot('ziggurat');
        });
    });
});
