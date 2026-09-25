import GameView from '../../GameView.js';

describe('GameView visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('renders an empty 3x3 board', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);

            await mountGameView(gameView);

            cy.compareSnapshot('empty-board');
        });
    });

    it('display a red and blue stone', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);

            gameView.setStone('b2', 0);
            gameView.setStone('c3', 1);

            await mountGameView(gameView);

            cy.compareSnapshot('red-and-blue-stones');
        });
    });
});
