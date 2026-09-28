import GameView from '../../GameView.js';
import { Anchor44Facade } from '../../facades/Anchor44Facade.js';
import { PlayingGameFacade } from '../../facades/PlayingGameFacade.js';
import { resolveTheme } from '../../theming/resolveTheme.js';
import { polishNostalgiaTheme } from '../../themes/polish-nostalgia/index.js';

describe('Polish Nostalgia theme visual regression', () => {
    beforeEach(() => {
        cy.visit('/');
    });

    it('renders board, stones, 4-4 anchors, coords and last move on light stone', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(11, {
                theme: resolveTheme(polishNostalgiaTheme, 'dark'),
                orientation: GameView.ORIENTATION_FLAT,
                displayCoords: true,
            });

            new Anchor44Facade(gameView);

            const playingGameFacade = new PlayingGameFacade(gameView, false);

            playingGameFacade.addMove('h4');
            playingGameFacade.addMove('h3');
            playingGameFacade.addMove('i9');
            playingGameFacade.addMove('g6');
            playingGameFacade.addMove('k5');
            playingGameFacade.addMove('e2');

            await mountGameView(gameView);

            cy.compareSnapshot('board');
        });
    });

    it('never fades sides', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, {
                theme: resolveTheme(polishNostalgiaTheme, 'dark'),
                orientation: GameView.ORIENTATION_FLAT,
            });

            gameView.highlightSideForPlayer(1);

            await mountGameView(gameView);

            cy.compareSnapshot('never-faded-sides');
        });
    });

    it('renders last move on dark stone', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, {
                theme: resolveTheme(polishNostalgiaTheme, 'dark'),
                orientation: GameView.ORIENTATION_FLAT,
            });

            const playingGameFacade = new PlayingGameFacade(gameView, false);

            playingGameFacade.addMove('b2');
            playingGameFacade.addMove('c3');
            playingGameFacade.addMove('d3');

            await mountGameView(gameView);

            cy.compareSnapshot('last-move-dark-stone');
        });
    });

    it('renders swappable mark', () => {
        cy.window().then(async ({ mountGameView }) => {
            const gameView = new GameView(5, {
                theme: resolveTheme(polishNostalgiaTheme, 'dark'),
                orientation: GameView.ORIENTATION_FLAT,
            });

            const playingGameFacade = new PlayingGameFacade(gameView, true);

            playingGameFacade.addMove('c3');

            await mountGameView(gameView);

            cy.compareSnapshot('swappable');
        });
    });
});
