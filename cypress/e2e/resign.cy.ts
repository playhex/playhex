describe('Resign a game', () => {
    it('displays button to resign a game', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom();

        // Play at least one move to have Resign button (random bot will play the other move)
        cy.play(409, 326);

        cy
            .contains('Resign')
            .click()
        ;

        cy
            .contains('Are you sure you want to resign the game?')
            .closest('.modal-content')
            .contains('Yes, resign')
            .click()
        ;

        cy.contains('Game finished');
        cy.contains(' wins!');
    });
});
