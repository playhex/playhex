describe('Cancel a game', () => {
    it('displays button to cancel a game', () => {
        cy.visit('/');
        cy.containsGuestPseudo('.menu-top');

        cy.createAIGameWithRandom();

        cy
            .contains('Cancel')
            .click()
        ;

        cy
            .contains('Are you sure you want to cancel the game?')
            .closest('.modal-content')
            .contains('Yes, cancel')
            .click()
        ;

        cy.contains('Game finished');
        cy.contains('Game has been canceled.');
    });

    it('cancels successfully an 1v1 game if nobody joined', () => {
        cy.visit('/');
        cy.containsGuestPseudo('.menu-top');

        cy
            .contains('Ranked')
            .click()
        ;

        cy
            .contains('.modal button', 'Create 1v1 ranked')
            .click()
        ;

        cy.contains('waiting…');

        cy
            .contains('Cancel')
            .click()
        ;

        cy
            .contains('Are you sure you want to cancel the game?')
            .closest('.modal-content')
            .contains('Yes, cancel')
            .click()
        ;

        cy.contains('Game finished');
        cy.contains('Game has been canceled');
        cy.contains('.modal-content .modal-footer', 'Close').click();

        cy.contains('.sidebar', 'Game has been canceled');
    });
});
