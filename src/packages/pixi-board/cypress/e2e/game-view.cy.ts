import GameView from '../../GameView.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import { Anchor44Facade } from '../../facades/Anchor44Facade.js';
import { CellsMask } from '../../cells-mask/CellsMask.js';

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

    // Destroying a pixi app with releaseGlobalResources clears batch pool shared with other apps (HEX-JS-E3)
    it('keeps rendering a board after another board is destroyed', () => {
        cy.window().then(async win => {
            const createContainer = (): HTMLElement => {
                const element = win.document.createElement('div');
                element.style.width = '200px';
                element.style.height = '200px';
                win.document.body.appendChild(element);

                return element;
            };

            // Kept board needs more batches than the destroyed one (masks and coords break batches)
            const destroyed = new GameView(3);
            const kept = new GameView(5, {
                displayCoords: true,
                cellsMask: CellsMask.hiding(5, ['a1', 'e5']),
            });

            await destroyed.mount(createContainer());
            await kept.mount(createContainer());

            // Render explicitly, ticker is not reliably run in spec iframe
            destroyed.getPixiApp().render();
            kept.getPixiApp().render();

            // Rebuild kept board so its batches are taken from pixi batch pool
            kept.setStone('c2', 0);
            kept.getPixiApp().render();

            destroyed.destroy();

            kept.getPixiApp().render();
            kept.destroy();
        });
    });
});
