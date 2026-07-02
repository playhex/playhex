describe('Time controls', () => {
    beforeEach(() => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom(false);

        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('Custom')
            .click()

            .closest('.modal-content')
            .contains('More options')
            .click()
        ;

        // I must play first to keep full time for my opponent and make assertions on his time
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^First$/)
            .click()
        ;
    });

    it('create a game with default 10 minutes for each player', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')

            .contains('Live')
            .closest('div')
            .contains('Long 10 + 20')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('TestBot Determinist instant');
        cy.contains('10:00');
    });

    it('create a game with default 5 minutes for each player', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')

            .contains('Live')
            .closest('div')
            .contains('Normal 5 + 10')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('TestBot Determinist instant');
        cy.contains('5:00');
    });

    it('creates a game with capped Fischer', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')

            .contains('Live')
            .closest('div')
            .contains('Normal 5 + 10')
            .click()

            .closest('.modal-content')
            .contains('Capped Fischer')
            .click()
        ;

        // Change initial time AFTER checking Capped Fischer to make sure maxTime updates
        // Initial time: 2h
        cy
            .get('input#custom-initial-time')
            .invoke('val', 23)
            .trigger('input')
        ;

        cy.contains('Initial time: 2h');

        cy.submitAIGame();

        cy.contains('.sidebar', 'Playing');
        cy.get('.nav-game-sidebar').contains('Info').click();

        cy.contains('2h + 2s cap. 5min').should('not.exist');
        cy.contains('2h + 2s cap.');
    });

    it('cancels a game when timeout with only one move', () => {
        // Plays a second to make a one-move game
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains(/^Second$/)
            .click()
        ;

        // Put minimal time
        cy
            .get('input#custom-initial-time')
            .invoke('val', 0)
            .trigger('input')
        ;

        cy.submitAIGame();

        cy.contains('Game has been canceled', { timeout: 8000 });
        cy.contains('.modal-content .modal-footer', 'Close').click();
        cy.contains('.player-b', '0:00.0');

        cy.contains('.sidebar', 'Game has been canceled');
    });

    it('creates a correspondence game, capped by default', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')

            .contains('Correspondence')
            .click()
        ;

        // Initial time: 2d
        cy
            .get('input#custom-initial-time')
            .invoke('val', 1)
            .trigger('input')
        ;

        cy.contains('Initial time: 2d');

        cy.submitAIGame();

        cy.contains('.sidebar', 'Playing');
        cy.get('.nav-game-sidebar').contains('Info').click();

        cy.contains('2d + 1d cap.');
    });
});
