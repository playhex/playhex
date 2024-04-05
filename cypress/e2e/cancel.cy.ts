describe('Cancel a game', () => {
    it('displays button to cancel a game', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

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
});
