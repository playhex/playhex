import { PreviewMoveFacade } from '../../facades/PreviewMoveFacade.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import GameView from '../../GameView.js';

describe('GameView visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('preview a move', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);
            const previewMoveFacade = new PreviewMoveFacade(gameView);

            await mountGameView(gameView);

            previewMoveFacade.preview('b2', 0);

            cy.compareSnapshot('preview-move');
        });
    });

    it('preview a swap move b3', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);
            const playingGameFacade = new PlayingGameFacade(gameView);
            const previewMoveFacade = new PreviewMoveFacade(gameView);

            playingGameFacade.addMove('b3');

            await mountGameView(gameView);

            previewMoveFacade.preview('c2', 1, 'b3');

            cy.compareSnapshot('preview-swap-move-b3');
        });
    });

    it('preview a swap move b2', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);
            const playingGameFacade = new PlayingGameFacade(gameView);
            const previewMoveFacade = new PreviewMoveFacade(gameView);

            playingGameFacade.addMove('b2');

            await mountGameView(gameView);

            previewMoveFacade.preview('b2', 1, 'b2');

            cy.compareSnapshot('preview-swap-move-b2');
        });
    });
});
