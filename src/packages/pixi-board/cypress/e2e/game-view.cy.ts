import GameView from '../../GameView.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import { Anchor44Facade } from '../../facades/Anchor44Facade.js';

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

    it('renders an empty 3x3 board in flat orientation', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3, {
                orientation: GameView.ORIENTATION_FLAT,
            });

            await mountGameView(gameView);

            cy.compareSnapshot('empty-board-flat');
        });
    });

    it('renders an empty 3x3 board in flat orientation with coords', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3, {
                orientation: GameView.ORIENTATION_FLAT,
                displayCoords: true,
            });

            await mountGameView(gameView);

            cy.compareSnapshot('coords-flat');
        });
    });

    it('renders readme quick start example', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(9);

            gameView.setStone('d4', 0); // red stone
            gameView.setStone('e6', 1); // blue stone

            await mountGameView(gameView);

            cy.compareSnapshot('quick-start');
        });
    });

    it('renders a 11x11 game with 4-4 anchors and last move mark', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(11);
            const playingGameFacade = new PlayingGameFacade(gameView);

            new Anchor44Facade(gameView);

            for (const move of ['f6', 'd8', 'e8', 'e7', 'g4', 'h3', 'd9'] as const) {
                playingGameFacade.addMove(move);
            }

            await mountGameView(gameView);

            cy.compareSnapshot('game-11x11');
        });
    });
});
