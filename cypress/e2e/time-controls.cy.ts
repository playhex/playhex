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

            .contains('Time control')
            .closest('div')
            .contains('Normal 10 + 5')
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

            .contains('Time control')
            .closest('div')
            .contains('Fast 5 + 2')
            .click()
        ;

        cy.submitAIGame();

        cy.contains('TestBot Determinist instant');
        cy.contains('5:00');
    });

    it('create a game with custom time control, Byo Yomi', () => {
        cy
            .contains('h5', 'Play vs AI')
            .closest('.modal-content')
            .contains('Use Byo-Yomi')
            .click()
        ;

        cy.contains('Periods:');

        cy.submitAIGame();

        cy.contains('TestBot Determinist instant');
        cy.contains('10:00 + 5 × 5s');

        // byo yomi dates are well deserialized
        cy.play(406, 397);

        cy.reload();

        cy.contains(/\d+:\d+ \+ 5 × 5s/);
        cy.contains('.chrono-time', 'NaN').should('not.exist');
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
            .get('input#custom-fischer-initial-time')
            .invoke('val', 0)
            .trigger('input')
        ;

        cy.submitAIGame();

        cy.contains('Game has been canceled', { timeout: 8000 });
        cy.contains('.modal-content .modal-footer', 'Close').click();
        cy.contains('.player-b', '0:00.0');

        cy.contains('.sidebar', 'Game has been canceled');
    });
});
