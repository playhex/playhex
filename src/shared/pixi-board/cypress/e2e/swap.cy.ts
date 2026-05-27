import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import GameView from '../../GameView.js';

describe('GameView visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('show swappable and swapped', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);
            const playingGameFacade = new PlayingGameFacade(gameView);

            playingGameFacade.addMove('a2');

            await mountGameView(gameView);

            cy.compareSnapshot('swappable')
                .then(() => playingGameFacade.addMove('swap-pieces'));

            cy.compareSnapshot('swapped');
        });
    });

    it('show swappable and swapped when first move playing on long diagonale', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(3);
            const playingGameFacade = new PlayingGameFacade(gameView);

            playingGameFacade.addMove('b2');

            await mountGameView(gameView);

            cy.compareSnapshot('long-diagonale-swappable')
                .then(() => playingGameFacade.addMove('swap-pieces'));

            cy.compareSnapshot('long-diagonale-swapped');
        });
    });
});
